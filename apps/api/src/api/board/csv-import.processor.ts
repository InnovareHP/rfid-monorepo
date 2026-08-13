import {
  BOARD_NOTIFICATION_EVENT,
  normalizeKey,
  normalizeOptionValue,
} from "@dashboard/shared";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { BoardFieldType, Field, FieldOption, ModuleType } from "@prisma/client";
import { Job } from "bullmq";
import { isSelectType } from "src/lib/helper";
import { resolveModuleId } from "src/lib/module/system-modules";
import { prisma } from "src/lib/prisma/prisma";
import { runWithTenant } from "src/lib/prisma/tenant-context";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { BoardNotifyService } from "./board-notify.service";
import { BoardGateway } from "./board.gateway";

export interface CsvImportJobData {
  excelData: Record<string, unknown>[];
  organizationId: string;
  moduleType: string;
  userId: string;
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

  constructor(
    private readonly boardGateway: BoardGateway,
    private readonly boardNotify: BoardNotifyService
  ) {
    super();
  }

  // Jobs run outside a request, so the payload organization opens the tenant store.
  async process(job: Job<CsvImportJobData>) {
    return runWithTenant(job.data.organizationId, () => this.handle(job));
  }

  private async handle(job: Job<CsvImportJobData>) {
    const { excelData, organizationId, moduleType } = job.data;

    this.logger.log(
      `Processing CSV import job ${job.id} — ${excelData.length} rows`
    );

    const moduleId = await resolveModuleId(moduleType);

    const fields = (await prisma.field.findMany({
      where: {
        organizationId: organizationId,
        moduleId: moduleId,
      },
      include: { options: true },
    })) as (Field & { options: FieldOption[] })[];

    const fieldMap = new Map<string, Field & { options: FieldOption[] }>();
    for (const field of fields) {
      fieldMap.set(normalizeKey(field.fieldName), field);
    }

    const recordsToCreate: {
      recordName: string;
      organizationId: string;
      moduleType: ModuleType;
      moduleId: string;
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
        moduleType: moduleType as ModuleType,
        moduleId: moduleId,
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
          organizationId: string;
        }[] = [];

        for (const [fieldId, options] of optionsToCreate.entries()) {
          for (const opt of options) {
            optionRows.push({
              optionName: opt,
              fieldId: fieldId,
              organizationId: organizationId,
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
        organizationId: organizationId,
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
        moduleType,
      });

    await this.boardNotify.notifyActor({
      organizationId,
      moduleType,
      actorUserId: job.data.userId,
      event: BOARD_NOTIFICATION_EVENT.IMPORT_FINISHED,
      title: `Import finished — ${recordsToCreate.length} record(s) added`,
    });

    return { recordsImported: recordsToCreate.length };
  }
}
