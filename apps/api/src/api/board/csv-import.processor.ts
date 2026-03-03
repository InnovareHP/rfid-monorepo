import { normalizeKey, normalizeOptionValue } from "@dashboard/shared";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { BoardFieldType, Field, FieldOption } from "@prisma/client";
import { Job } from "bullmq";
import { isSelectType } from "src/lib/helper";
import { prisma } from "src/lib/prisma/prisma";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { BoardGateway } from "./board.gateway";

export interface CsvImportJobData {
  excelData: Record<string, unknown>[];
  organizationId: string;
  moduleType: string;
}

function resolveRecordName(row: Record<string, unknown>): string {
  return String(
    row["Name of Organization"] ||
    row["Company Name"] ||
    row["Organization"] ||
    row["Org Name"] ||
    "Untitled Lead"
  );
}

@Processor(QUEUE_NAMES.CSV_IMPORT)
export class CsvImportProcessor extends WorkerHost {
  private readonly logger = new Logger(CsvImportProcessor.name);

  constructor(private readonly boardGateway: BoardGateway) {
    super();
  }

  async process(job: Job<CsvImportJobData>) {
    const { excelData, organizationId, moduleType } = job.data;

    this.logger.log(
      `Processing CSV import job ${job.id} — ${excelData.length} rows`
    );

    const fields = (await prisma.field.findMany({
      where: { organizationId: organizationId, moduleType: moduleType },
      include: { options: true },
    })) as (Field & { options: FieldOption[] })[];

    const fieldMap = new Map<string, Field & { options: FieldOption[] }>();
    for (const field of fields) {
      fieldMap.set(normalizeKey(field.fieldName), field);
    }

    const recordsToCreate: {
      recordName: string;
      organizationId: string;
      moduleType: string;
    }[] = [];

    const recordValueBuffer: {
      record_index: number;
      fieldId: string;
      value: string;
    }[] = [];

    const optionsToCreate = new Map<string, Set<string>>();

    excelData.forEach((row, rowIndex) => {
      const recordName = resolveRecordName(row);

      recordsToCreate.push({
        recordName: recordName,
        organizationId: organizationId,
        moduleType: moduleType,
      });

      for (const [csvFieldName, rawValue] of Object.entries(row)) {
        if (!rawValue || String(rawValue).trim() === "") continue;

        const field = fieldMap.get(normalizeKey(csvFieldName));
        if (!field) continue;

        let value = normalizeOptionValue(String(rawValue));
        if (!value) continue;

        if (isSelectType(field.fieldType)) {
          const values =
            field.fieldType === BoardFieldType.MULTISELECT
              ? value.split(",").map(normalizeOptionValue)
              : [normalizeOptionValue(value)];

          for (const v of values) {
            if (!v) continue;

            const exists = field.options.some(
              (opt) =>
                normalizeOptionValue(opt.optionName).toLowerCase() ===
                v.toLowerCase()
            );

            if (!exists) {
              if (!optionsToCreate.has(field.id)) {
                optionsToCreate.set(field.id, new Set());
              }
              optionsToCreate.get(field.id)!.add(v);
            }
          }

          value = values.join(",");
        }

        recordValueBuffer.push({
          record_index: rowIndex,
          fieldId: field.id,
          value,
        });
      }

      if ((rowIndex + 1) % 50 === 0) {
        job.updateProgress({
          phase: "parsing",
          processed: rowIndex + 1,
          total: excelData.length,
        });
      }
    });

    await prisma.$transaction(async (tx) => {
      await tx.board.createMany({
        data: recordsToCreate,
      });

      const createdRecords = await tx.board.findMany({
        where: { organizationId: organizationId },
        orderBy: { createdAt: "desc" },
        take: recordsToCreate.length,
      });

      createdRecords.reverse();

      if (optionsToCreate.size > 0) {
        const optionRows: {
          optionName: string;
          fieldId: string;
        }[] = [];

        for (const [fieldId, options] of optionsToCreate.entries()) {
          for (const opt of options) {
            optionRows.push({
              optionName: opt,
              fieldId: fieldId,
            });
          }
        }

        await tx.fieldOption.createMany({
          data: optionRows,
          skipDuplicates: true,
        });
      }

      const recordValues = recordValueBuffer.map((lv) => ({
        recordId: createdRecords[lv.record_index].id,
        fieldId: lv.fieldId,
        value: lv.value,
      }));

      await tx.fieldValue.createMany({
        data: recordValues,
        skipDuplicates: true,
      });
    });

    await job.updateProgress({
      phase: "complete",
      processed: excelData.length,
      total: excelData.length,
    });

    this.boardGateway.server
      .to(`org:${organizationId}`)
      .emit("board:csv-import-complete", {
        jobId: job.id,
        recordsImported: recordsToCreate.length,
      });

    return { recordsImported: recordsToCreate.length };
  }
}
