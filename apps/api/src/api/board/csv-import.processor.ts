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
      where: { organization_id: organizationId, module_type: moduleType },
      include: { options: true },
    })) as (Field & { options: FieldOption[] })[];

    const fieldMap = new Map<string, Field & { options: FieldOption[] }>();
    for (const field of fields) {
      fieldMap.set(normalizeKey(field.field_name), field);
    }

    const recordsToCreate: {
      record_name: string;
      organization_id: string;
      module_type: string;
    }[] = [];

    const recordValueBuffer: {
      record_index: number;
      field_id: string;
      value: string;
    }[] = [];

    const optionsToCreate = new Map<string, Set<string>>();

    excelData.forEach((row, rowIndex) => {
      const recordName = resolveRecordName(row);

      recordsToCreate.push({
        record_name: recordName,
        organization_id: organizationId,
        module_type: moduleType,
      });

      for (const [csvFieldName, rawValue] of Object.entries(row)) {
        if (!rawValue || String(rawValue).trim() === "") continue;

        const field = fieldMap.get(normalizeKey(csvFieldName));
        if (!field) continue;

        let value = normalizeOptionValue(String(rawValue));
        if (!value) continue;

        if (isSelectType(field.field_type)) {
          const values =
            field.field_type === BoardFieldType.MULTISELECT
              ? value.split(",").map(normalizeOptionValue)
              : [normalizeOptionValue(value)];

          for (const v of values) {
            if (!v) continue;

            const exists = field.options.some(
              (opt) =>
                normalizeOptionValue(opt.option_name).toLowerCase() ===
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
          field_id: field.id,
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
        where: { organization_id: organizationId },
        orderBy: { created_at: "desc" },
        take: recordsToCreate.length,
      });

      createdRecords.reverse();

      if (optionsToCreate.size > 0) {
        const optionRows: {
          option_name: string;
          field_id: string;
        }[] = [];

        for (const [fieldId, options] of optionsToCreate.entries()) {
          for (const opt of options) {
            optionRows.push({
              option_name: opt,
              field_id: fieldId,
            });
          }
        }

        await tx.fieldOption.createMany({
          data: optionRows,
          skipDuplicates: true,
        });
      }

      const recordValues = recordValueBuffer.map((lv) => ({
        record_id: createdRecords[lv.record_index].id,
        field_id: lv.field_id,
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
