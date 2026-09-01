import {
  BOARD_NOTIFICATION_EVENT,
  normalizeOptionValue,
} from "@dashboard/shared";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { BoardFieldType, Field, FieldOption, ModuleType } from "@prisma/client";
import { recordNameIndexes } from "../../lib/crypto/record-name-index";
import { Job } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { isSelectType } from "src/lib/helper";
import { resolveModuleId, toModuleType } from "src/lib/module/system-modules";
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
  columnMap: Record<string, string>;
  nameColumn: string;
}

// unknown, not string: a cell can come through as a number, boolean, or a
// stray object/array, and String() on the latter silently writes "[object Object]".
function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
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
    const { excelData, organizationId, moduleType, columnMap, nameColumn } =
      job.data;

    this.logger.log(
      `Processing CSV import job ${job.id} — ${excelData.length} rows`
    );

    const moduleId = await resolveModuleId(moduleType, organizationId);

    // A custom module's label lives only in this row, not in SYSTEM_MODULES.
    const { labelSingular } = await prisma.module.findUniqueOrThrow({
      where: { id: moduleId },
      select: { labelSingular: true },
    });

    // isDeleted matters: the board only renders live fields, so a value written
    // onto a soft-deleted one is stored and never seen again.
    const fields = (await prisma.field.findMany({
      where: {
        organizationId: organizationId,
        moduleId: moduleId,
        isDeleted: false,
      },
      include: { options: true },
    })) as (Field & { options: FieldOption[] })[];

    const fieldById = new Map(fields.map((field) => [field.id, field]));

    // The mapping is the user's, but the ids in it are still theirs to prove:
    // anything outside this module's live fields is dropped, not trusted.
    const fieldByHeader = new Map<string, Field & { options: FieldOption[] }>();
    for (const [header, fieldId] of Object.entries(columnMap)) {
      const field = fieldById.get(fieldId);
      if (field) fieldByHeader.set(header, field);
    }

    if (fieldByHeader.size === 0) {
      throw new Error("No CSV column maps to a field on this module");
    }

    // Ids are generated here rather than read back after the insert: the read
    // took the newest N rows for the organization, so anything created
    // concurrently shifted every value onto the wrong record.
    const recordsToCreate: {
      id: string;
      recordName: string;
      recordNameHash: string | null;
      recordNameFuzzyHash: string | null;
      organizationId: string;
      moduleType: ModuleType;
      moduleId: string;
    }[] = [];

    // Names already on this module, so a re-run of the same file adds nothing.
    // Only the hashes are read: the names themselves stay encrypted.
    const existing = await prisma.board.findMany({
      where: { organizationId, moduleId, isDeleted: false },
      select: { recordNameHash: true, recordNameFuzzyHash: true },
    });

    const takenExact = new Set(
      existing
        .map((record) => record.recordNameHash)
        .filter((hash): hash is string => hash !== null)
    );
    const takenFuzzy = new Set(
      existing
        .map((record) => record.recordNameFuzzyHash)
        .filter((hash): hash is string => hash !== null)
    );

    const skipped: { row: number; recordName: string }[] = [];
    const nearMatches: { row: number; recordName: string }[] = [];

    // Keyed by record id, not row index: a skipped duplicate shifts every
    // later row and would otherwise write its values onto the wrong record.
    const recordValueBuffer: {
      recordId: string;
      fieldId: string;
      value: string;
    }[] = [];

    const optionsToCreate = new Map<string, Set<string>>();

    excelData.forEach((row, rowIndex) => {
      const recordName =
        normalizeOptionValue(stringifyCell(row[nameColumn])) ||
        `Untitled ${labelSingular}`;

      const { recordNameHash, recordNameFuzzyHash } =
        recordNameIndexes(recordName);

      // An exact name match is a duplicate whether it came from the file or is
      // already on the board, so the row is dropped and reported rather than
      // creating a second copy.
      if (recordNameHash && takenExact.has(recordNameHash)) {
        skipped.push({ row: rowIndex + 1, recordName });
        return;
      }

      // A looser match is only probably the same record, so it is imported and
      // flagged for review instead of being refused.
      if (recordNameFuzzyHash && takenFuzzy.has(recordNameFuzzyHash)) {
        nearMatches.push({ row: rowIndex + 1, recordName });
      }

      if (recordNameHash) takenExact.add(recordNameHash);
      if (recordNameFuzzyHash) takenFuzzy.add(recordNameFuzzyHash);

      const recordId = uuidv4();

      recordsToCreate.push({
        id: recordId,
        recordName: recordName,
        recordNameHash,
        recordNameFuzzyHash,
        organizationId: organizationId,
        moduleType: toModuleType(moduleType),
        moduleId: moduleId,
      });

      for (const [header, rawValue] of Object.entries(row)) {
        const rawText = stringifyCell(rawValue);
        if (!rawText.trim()) continue;

        const field = fieldByHeader.get(header);
        if (!field) continue;

        let value = normalizeOptionValue(rawText);
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
          recordId,
          fieldId: field.id,
          value,
        });
      }

      if ((rowIndex + 1) % 50 === 0) {
        void job.updateProgress({
          phase: "parsing",
          processed: rowIndex + 1,
          total: excelData.length,
        });
      }
    });

    await prisma.$transaction(
      async (tx) => {
        await tx.board.createMany({ data: recordsToCreate });

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
          recordId: lv.recordId,
          fieldId: lv.fieldId,
          value: lv.value,
          organizationId: organizationId,
        }));

        await tx.fieldValue.createMany({
          data: recordValues,
          skipDuplicates: true,
        });
      },
      // A full file does not finish inside the 5s interactive default, and this
      // runs on a worker where a long write is acceptable.
      { timeout: 120_000, maxWait: 10_000 }
    );

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
        duplicatesSkipped: skipped.length,
        nearMatches: nearMatches.length,
        moduleType,
      });

    await this.boardNotify.notifyActor({
      organizationId,
      moduleType,
      actorUserId: job.data.userId,
      event: BOARD_NOTIFICATION_EVENT.IMPORT_FINISHED,
      title: `Import finished — ${recordsToCreate.length} record(s) added${
        skipped.length ? `, ${skipped.length} duplicate(s) skipped` : ""
      }`,
    });

    // Rows are capped so a pathological file cannot return a payload larger
    // than the import itself; the counts stay exact either way.
    return {
      recordsImported: recordsToCreate.length,
      duplicatesSkipped: skipped.length,
      nearMatchCount: nearMatches.length,
      duplicates: skipped.slice(0, 50),
      nearMatches: nearMatches.slice(0, 50),
    };
  }
}
