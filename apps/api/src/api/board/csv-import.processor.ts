import {
  BOARD_NOTIFICATION_EVENT,
  normalizeFieldValue,
  normalizeOptionValue,
} from "@dashboard/shared";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import {
  BoardFieldType,
  Field,
  FieldOption,
  ModuleType,
  RelationType,
} from "@prisma/client";
import {
  normalizeRecordNameLoose,
  recordNameIndexes,
} from "../../lib/crypto/record-name-index";
import { createSimilarNameFinder } from "../../lib/board/name-similarity";
import { Job } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { isSelectType } from "src/lib/helper";
import { resolveModuleId, toModuleType } from "src/lib/module/system-modules";
import { prisma } from "src/lib/prisma/prisma";
import { purgeBoardCaches } from "src/lib/redis/redis";
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

// A link cell names another module's record. Imported rows only ever carried
// that name, and with no BoardRelation behind them every facility and county
// figure in analytics was blind to them.
const LINK_TARGETS: Record<
  string,
  { module: ModuleType; relation: RelationType }
> = {
  [BoardFieldType.CONTACT_LINK]: {
    module: ModuleType.CONTACT,
    relation: RelationType.CONTACT_LINK,
  },
  [BoardFieldType.COMPANY_LINK]: {
    module: ModuleType.COMPANY,
    relation: RelationType.COMPANY_LINK,
  },
  [BoardFieldType.REFERRAL_LINK]: {
    module: ModuleType.LEAD,
    relation: RelationType.REFERRAL_LINK,
  },
};

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
    // The name is read alongside the hash because similarity cannot be scored
    // against a hash - it needs the plaintext, which the client decrypts here.
    const existing = await prisma.board.findMany({
      where: { organizationId, moduleId, isDeleted: false },
      select: { recordName: true, recordNameHash: true },
    });

    const takenExact = new Set(
      existing
        .map((record) => record.recordNameHash)
        .filter((hash): hash is string => hash !== null)
    );

    // Seeded with the board, then grown per accepted row, so the file is
    // deduplicated against itself as well as against what is already there.
    const similarNames = createSimilarNameFinder();
    for (const record of existing) {
      similarNames.add(
        record.recordName,
        normalizeRecordNameLoose(record.recordName)
      );
    }

    // One read per linked module, keyed both ways: a cell holds either the
    // target id or the name it was exported under.
    const linkFields = fields.filter((field) => LINK_TARGETS[field.fieldType]);
    const targetModules = [
      ...new Set(
        linkFields.map((field) => LINK_TARGETS[field.fieldType].module)
      ),
    ];
    const targetsByModule = new Map<
      ModuleType,
      {
        byId: Set<string>;
        byNameHash: Map<string, string>;
        byFuzzyHash: Map<string, string>;
      }
    >();

    for (const targetModule of targetModules) {
      const targets = await prisma.board.findMany({
        where: {
          organizationId,
          moduleType: targetModule,
          isDeleted: false,
        },
        select: {
          id: true,
          recordNameHash: true,
          recordNameFuzzyHash: true,
        },
      });

      targetsByModule.set(targetModule, {
        byId: new Set(targets.map((target) => target.id)),
        byNameHash: new Map(
          targets
            .filter((target) => target.recordNameHash)
            .map((target) => [target.recordNameHash as string, target.id])
        ),
        // The looser index exists and was going unused here, so a spreadsheet
        // writing "Cedar Ridge Nursing & Rehab" against a record called
        // "Cedar Ridge Nursing and Rehabilitation" resolved to nothing and the
        // cell was dropped. Punctuation and a legal suffix are not a different
        // facility.
        byFuzzyHash: new Map(
          targets
            .filter((target) => target.recordNameFuzzyHash)
            .map((target) => [target.recordNameFuzzyHash as string, target.id])
        ),
      });
    }

    const relations: {
      sourceId: string;
      targetId: string;
      relationType: RelationType;
      organizationId: string;
    }[] = [];
    // Cells naming a record this organization does not have. Reported rather
    // than written, so a name never sits in a column that holds ids.
    const unlinked: { row: number; field: string; value: string }[] = [];

    const skipped: { row: number; recordName: string }[] = [];
    const nearMatches: {
      row: number;
      recordName: string;
      matchedName: string;
    }[] = [];

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

      // Dropped on the same terms as create and rename, which both refuse a
      // name that only looks like an existing record. Reported with the name it
      // matched so the row can be checked rather than guessed at.
      const loose = normalizeRecordNameLoose(recordName);
      const matchedName = similarNames.find(loose);

      if (matchedName) {
        nearMatches.push({ row: rowIndex + 1, recordName, matchedName });
        return;
      }

      if (recordNameHash) takenExact.add(recordNameHash);
      similarNames.add(recordName, loose);

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

        // Same normalizer the interactive create and edit paths use, so an
        // imported row and a typed one land in the same shape.
        let value = normalizeFieldValue(field.fieldType, rawText);
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

        const link = LINK_TARGETS[field.fieldType];
        if (link) {
          const targets = targetsByModule.get(link.module);
          const { recordNameHash, recordNameFuzzyHash } =
            recordNameIndexes(value);
          const targetId = targets?.byId.has(value)
            ? value
            : ((recordNameHash
                ? targets?.byNameHash.get(recordNameHash)
                : undefined) ??
              (recordNameFuzzyHash
                ? targets?.byFuzzyHash.get(recordNameFuzzyHash)
                : undefined));

          if (!targetId) {
            // Named but unresolvable: the cell is dropped, so it is counted and
            // reported. Silently losing the link is what leaves every
            // facility-shaped report empty with no explanation.
            unlinked.push({ row: rowIndex + 1, field: field.fieldName, value });
            continue;
          }

          relations.push({
            sourceId: recordId,
            targetId,
            relationType: link.relation,
            organizationId,
          });
          value = targetId;
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

    // County is maintained on the account, so an imported referral takes the
    // county of the facility it links to, exactly as an interactive link does.
    const countyField = fields.find((field) => field.fieldName === "County");
    const referralLinks = relations.filter(
      (relation) => relation.relationType === RelationType.REFERRAL_LINK
    );

    if (countyField && referralLinks.length > 0) {
      const countyValues = await prisma.fieldValue.findMany({
        where: {
          recordId: {
            in: [...new Set(referralLinks.map((link) => link.targetId))],
          },
          field: {
            fieldName: "County",
            moduleType: ModuleType.LEAD,
            isDeleted: false,
          },
        },
        select: { recordId: true, value: true },
      });

      const countyByLead = new Map(
        countyValues.map((row) => [row.recordId, row.value])
      );
      const bufferIndex = new Map(
        recordValueBuffer.map((entry, index) => [
          `${entry.recordId}:${entry.fieldId}`,
          index,
        ])
      );

      for (const link of referralLinks) {
        const county = countyByLead.get(link.targetId);
        if (!county) continue;

        const key = `${link.sourceId}:${countyField.id}`;
        const index = bufferIndex.get(key);

        if (index === undefined) {
          recordValueBuffer.push({
            recordId: link.sourceId,
            fieldId: countyField.id,
            value: county,
          });
          continue;
        }

        recordValueBuffer[index].value = county;
      }
    }

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

        if (relations.length > 0) {
          await tx.boardRelation.createMany({
            data: relations,
            skipDuplicates: true,
          });
        }
      },
      // A full file does not finish inside the 5s interactive default, and this
      // runs on a worker where a long write is acceptable.
      { timeout: 120_000, maxWait: 10_000 }
    );

    // The import wrote boards, so the cached pages and the analytics built
    // from them are answers about a table that no longer exists.
    await purgeBoardCaches(organizationId, moduleType);

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
        unlinkedCells: unlinked.length,
        moduleType,
      });

    await this.boardNotify.notifyActor({
      organizationId,
      moduleType,
      actorUserId: job.data.userId,
      event: BOARD_NOTIFICATION_EVENT.IMPORT_FINISHED,
      title: `Import finished — ${recordsToCreate.length} record(s) added${
        skipped.length ? `, ${skipped.length} duplicate(s) skipped` : ""
      }${
        nearMatches.length
          ? `, ${nearMatches.length} similar name(s) skipped`
          : ""
      }${
        unlinked.length
          ? `, ${unlinked.length} cell(s) named a record that does not exist`
          : ""
      }`,
    });

    // Rows are capped so a pathological file cannot return a payload larger
    // than the import itself; the counts stay exact either way.
    return {
      recordsImported: recordsToCreate.length,
      duplicatesSkipped: skipped.length,
      nearMatchCount: nearMatches.length,
      unlinkedCells: unlinked.length,
      duplicates: skipped.slice(0, 50),
      nearMatches: nearMatches.slice(0, 50),
      // Which cells, not just how many: a count alone does not tell anyone
      // which spreadsheet rows to fix.
      unlinked: unlinked.slice(0, 50),
    };
  }
}
