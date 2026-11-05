import { ACCOUNT_MANAGER_ROLES } from "@dashboard/shared";
import { TouchpointType } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";
import { toActivityFields } from "src/api/liaison/liaison.service";
import { prisma } from "src/lib/prisma/prisma";
import { runWithTenant } from "src/lib/prisma/tenant-context";
import { purgeBoardCaches, redis } from "src/lib/redis/redis";

// One-off import of the workbook's liaison logs into Marketing Logs, written the
// way LiaisonService.createMarketing writes them: log, mirrored activity, history.
// Account managers are set the way BoardService.updateAssignedTo sets them.
// Inputs are import-logs.json and account-managers.json from docs/marketing-import/prepare.py.
//
//   pnpm --filter api import:marketing-logs -- --org=<id> --file=<import-logs.json> --liaisons=tracy=<email>,amy=<email>,rich=<email>
//   ... --account-managers=<account-managers.json>   also set Account Manager, matched to --liaisons by first name
//   ... --apply                  write (a dry run without it)
//   pnpm --filter api import:marketing-logs -- --org=<id> --undo=<run file>

type LogRow = {
  sheet: string;
  row: number;
  date: string;
  facility: string;
  loggedAs: string;
  talkedTo: string;
  touchpoints: TouchpointType[];
  notes: string;
  extra: string;
};

type AccountManagerRow = { facility: string; accountManager: string };

type Assignment = { boardId: string; previousAssignedTo: string | null; historyId: string };

type RunFile = {
  organizationId: string;
  marketingIds: string[];
  historyIds: string[];
  assignments?: Assignment[];
};

const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const apply = process.argv.includes("--apply");

// Noon UTC lands on the same calendar day in every US time zone; the offset keeps
// same-day logs from tying, since the log list pages on createdAt alone.
const atNoon = (date: string, offsetSeconds: number) =>
  new Date(Date.parse(`${date}T12:00:00.000Z`) + offsetSeconds * 1000);

const dedupeKey = (facilityId: string, memberId: string | null, talkedTo: string, day: string) =>
  [facilityId, memberId, talkedTo.trim().toLowerCase(), day].join("|");

// The sheet names the liaison who made the visit, which outlives whose account holds the log.
const composeNotes = (log: LogRow) =>
  [
    `Liaison: ${log.sheet}`,
    log.notes,
    log.extra,
    log.loggedAs !== log.facility && `Logged as: ${log.loggedAs}`,
  ]
    .filter(Boolean)
    .join(" | ") || null;

async function resolveLiaisons(organizationId: string) {
  const pairs = (arg("liaisons") ?? "").split(",").filter(Boolean).map((p) => p.split("="));
  if (!pairs.length) throw new Error("Pass --liaisons=tracy=<email>,amy=<email>,rich=<email>");

  const bySheet = new Map<string, { memberId: string; userId: string; role: string; name: string }>();
  for (const [sheet, email] of pairs) {
    const member = await prisma.member.findFirst({
      where: { organizationId, user: { email } },
      select: { id: true, userId: true, role: true, user: { select: { name: true } } },
    });
    if (!member) throw new Error(`${email} is not a member of this organization`);
    bySheet.set(sheet.toLowerCase(), {
      memberId: member.id,
      userId: member.userId,
      role: member.role,
      name: member.user.name,
    });
  }
  return bySheet;
}

async function undo(organizationId: string, runPath: string) {
  const run: RunFile = JSON.parse(readFileSync(runPath, "utf-8"));
  if (run.organizationId !== organizationId) throw new Error("Run file belongs to another organization");
  const assignments = run.assignments ?? [];

  // Activity.marketingId cascades, so deleting the logs removes their activities.
  await prisma.$transaction(async (tx) => {
    for (const { boardId, previousAssignedTo } of assignments) {
      await tx.board.update({ where: { id: boardId }, data: { assignedTo: previousAssignedTo } });
    }
    const logs = await tx.marketing.deleteMany({ where: { id: { in: run.marketingIds }, organizationId } });
    const history = await tx.history.deleteMany({
      where: { id: { in: [...run.historyIds, ...assignments.map((a) => a.historyId)] }, organizationId },
    });
    console.log(
      `Removed ${logs.count} logs and ${history.count} history entries; restored ${assignments.length} account managers.`
    );
  });
  await purgeBoardCaches(organizationId);
}

async function main() {
  const organizationId = arg("org");
  if (!organizationId) throw new Error("Pass --org=<organizationId>");
  if (!(await prisma.organization.findUnique({ where: { id: organizationId } }))) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  const undoPath = arg("undo");
  if (undoPath) return runWithTenant(organizationId, () => undo(organizationId, undoPath));

  const file = arg("file");
  if (!file) throw new Error("Pass --file=<import-logs.json>");
  const logs: LogRow[] = JSON.parse(readFileSync(file, "utf-8"));

  await runWithTenant(organizationId, async () => {
    const liaisons = await resolveLiaisons(organizationId);
    const facilities = new Map<string, string>();
    const boards = await prisma.board.findMany({
      where: { organizationId, moduleType: "LEAD", isDeleted: false },
      select: { id: true, recordName: true, assignedTo: true, assignedUser: { select: { name: true } } },
    });
    for (const board of boards) facilities.set(board.recordName, board.id);
    const boardById = new Map(boards.map((board) => [board.id, board]));

    const existing = await prisma.marketing.findMany({
      where: { organizationId, isDeleted: false },
      select: { facilityRecordId: true, memberId: true, talkedTo: true, createdAt: true },
    });
    const seen = new Set(
      existing
        .filter((m) => m.facilityRecordId)
        .map((m) => dedupeKey(m.facilityRecordId!, m.memberId, m.talkedTo, m.createdAt.toISOString().slice(0, 10)))
    );

    const missingFacility = new Set<string>();
    const unknownSheet = new Set<string>();
    const toCreate: { log: LogRow; facilityId: string; memberId: string; userId: string }[] = [];
    let duplicates = 0;

    for (const log of logs) {
      const liaison = liaisons.get(log.sheet.toLowerCase());
      const facilityId = facilities.get(log.facility);
      if (!liaison) unknownSheet.add(log.sheet);
      if (!facilityId) missingFacility.add(log.facility);
      if (!liaison || !facilityId) continue;

      const key = dedupeKey(facilityId, liaison.memberId, log.talkedTo, log.date);
      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
      toCreate.push({ log, facilityId, ...liaison });
    }

    const perSheet = toCreate.reduce<Record<string, number>>((acc, { log }) => {
      acc[log.sheet] = (acc[log.sheet] ?? 0) + 1;
      return acc;
    }, {});
    console.log(`Rows in file: ${logs.length}`);
    console.log(`To create: ${toCreate.length} ${JSON.stringify(perSheet)}`);
    console.log(`Already imported (skipped): ${duplicates}`);
    console.log(`Facilities missing from the Master List: ${missingFacility.size}`);
    console.log(`Sheets with no liaison mapping: ${[...unknownSheet].join(", ") || "none"}`);

    // Matched to --liaisons by first name, and held to the roles the app allows as assignee.
    const managersPath = arg("account-managers");
    const managerRows: AccountManagerRow[] = managersPath ? JSON.parse(readFileSync(managersPath, "utf-8")) : [];
    const toAssign: { boardId: string; userId: string; name: string }[] = [];
    const unknownManager = new Set<string>();
    let alreadyAssigned = 0;
    for (const row of managerRows) {
      const manager = liaisons.get(row.accountManager.split(" ")[0].toLowerCase());
      const boardId = facilities.get(row.facility);
      if (!boardId) missingFacility.add(row.facility);
      if (!manager || !(ACCOUNT_MANAGER_ROLES as readonly string[]).includes(manager.role)) {
        unknownManager.add(row.accountManager);
      }
      if (!manager || !boardId || unknownManager.has(row.accountManager)) continue;
      if (boardById.get(boardId)?.assignedTo === manager.userId) {
        alreadyAssigned++;
        continue;
      }
      toAssign.push({ boardId, userId: manager.userId, name: manager.name });
    }
    if (managersPath) {
      const perManager = toAssign.reduce<Record<string, number>>((acc, { name }) => {
        acc[name] = (acc[name] ?? 0) + 1;
        return acc;
      }, {});
      console.log(`Account managers to set: ${toAssign.length} ${JSON.stringify(perManager)}`);
      console.log(`Account managers already set (skipped): ${alreadyAssigned}`);
      console.log(`Account managers with no eligible mapping: ${[...unknownManager].join(", ") || "none"}`);
    }

    if (missingFacility.size || unknownSheet.size || unknownManager.size) {
      throw new Error("Fix the missing facilities, liaison or account manager mapping before importing");
    }
    if (!apply) {
      console.log("Dry run. Pass --apply to write.");
      return;
    }

    const run: RunFile = { organizationId, marketingIds: [], historyIds: [], assignments: [] };
    const runPath = `${file.replace(/\.json$/, "")}.run-${Date.now()}.json`;
    const perDay = new Map<string, number>();
    try {
      for (const { log, facilityId, memberId, userId } of toCreate) {
        const offset = perDay.get(log.date) ?? 0;
        perDay.set(log.date, offset + 1);
        const createdAt = atNoon(log.date, offset);
        const notes = composeNotes(log);
        await prisma.$transaction(async (tx) => {
          const marketing = await tx.marketing.create({
            data: {
              facility: log.facility,
              touchpoints: log.touchpoints,
              talkedTo: log.talkedTo,
              notes,
              memberId,
              userId,
              organizationId,
              facilityRecordId: facilityId,
              createdAt,
            },
            select: { id: true },
          });
          await tx.activity.create({
            data: {
              ...toActivityFields({ touchpoints: log.touchpoints, talkedTo: log.talkedTo, notes }),
              status: "COMPLETED",
              completedAt: createdAt,
              createdAt,
              recordId: facilityId,
              marketingId: marketing.id,
              createdBy: userId,
              organizationId,
            },
          });
          const history = await tx.history.create({
            data: {
              recordId: facilityId,
              organizationId,
              column: "marketing",
              newValue: `Imported marketing log: ${log.touchpoints.join(", ")}, talked to ${log.talkedTo}${notes ? `, notes: ${notes}` : ""}, on ${log.date}`,
              createdBy: userId,
              action: "milestone_created",
              createdAt,
            },
            select: { id: true },
          });
          run.marketingIds.push(marketing.id);
          run.historyIds.push(history.id);
        });
      }

      for (const { boardId, userId, name } of toAssign) {
        const board = boardById.get(boardId)!;
        await prisma.$transaction(async (tx) => {
          await tx.board.update({ where: { id: boardId }, data: { assignedTo: userId } });
          const history = await tx.history.create({
            data: {
              recordId: boardId,
              organizationId,
              column: "Assigned To",
              oldValue: board.assignedUser?.name ?? "",
              newValue: name,
              createdBy: userId,
              action: "update",
            },
            select: { id: true },
          });
          run.assignments!.push({ boardId, previousAssignedTo: board.assignedTo, historyId: history.id });
        });
      }
    } finally {
      writeFileSync(runPath, JSON.stringify(run));
      await purgeBoardCaches(organizationId);
      console.log(
        `Created ${run.marketingIds.length} logs, set ${run.assignments!.length} account managers. Undo with --undo=${runPath}`
      );
    }
  });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([prisma.$disconnect(), redis.quit()]));
