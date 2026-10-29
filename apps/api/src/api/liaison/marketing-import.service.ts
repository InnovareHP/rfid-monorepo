import { ACCOUNT_MANAGER_ROLES } from "@dashboard/shared";
import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { recordNameIndex } from "../../lib/crypto/record-name-index";
import { prisma } from "../../lib/prisma/prisma";
import { purgeBoardCaches } from "../../lib/redis/redis";
import {
  ImportAccountManagersDto,
  ImportMarketingDto,
} from "./dto/liaison.schema";
import { toActivityFields } from "./liaison.service";

type Actor = { memberId: string; userId: string; organizationId: string };

type RowIssue = { row: number; value: string };

// Noon UTC lands on the same calendar day in every US time zone; the per-row
// second keeps same-day logs from tying, since the log list pages on createdAt.
// Wrapping at ten hours keeps any file size on its own calendar day.
const atNoon = (date: string, offsetSeconds: number) =>
  new Date(
    Date.parse(`${date}T12:00:00.000Z`) + (offsetSeconds % 36_000) * 1000
  );

const dedupeKey = (recordId: string, talkedTo: string, day: string) =>
  [recordId, talkedTo.trim().toLowerCase(), day].join("|");

// Every method runs a fixed number of queries per batch, whatever its size:
// lookups are one query each, writes are createMany, never a query per row.
@Injectable()
export class MarketingImportService {
  private async findFacilities(names: string[], organizationId: string) {
    const boards = await prisma.board.findMany({
      where: {
        organizationId,
        moduleType: "LEAD",
        isDeleted: false,
        recordNameHash: { in: [...new Set(names.map(recordNameIndex))] },
      },
      select: {
        id: true,
        recordNameHash: true,
        assignedTo: true,
        assignedUser: { select: { name: true } },
      },
    });
    return new Map(boards.map((board) => [board.recordNameHash!, board]));
  }

  async importMarketing(dto: ImportMarketingDto, actor: Actor) {
    const { memberId, userId, organizationId } = actor;
    const facilities = await this.findFacilities(
      dto.rows.map((row) => row.facility),
      organizationId
    );

    const rows = dto.rows.map((row, index) => ({
      ...row,
      line: dto.firstRow + index,
      board: facilities.get(recordNameIndex(row.facility)),
    }));
    const missing: RowIssue[] = rows
      .filter((row) => !row.board)
      .map((row) => ({ row: row.line, value: row.facility }));
    if (missing.length && !dto.dryRun) {
      throw new BadRequestException(
        "Some facilities are not in the Master List"
      );
    }

    const found = rows.filter((row) => row.board);
    const days = found.map((row) => row.date).sort();
    const existing = found.length
      ? await prisma.marketing.findMany({
          where: {
            organizationId,
            memberId,
            isDeleted: false,
            facilityRecordId: { in: found.map((row) => row.board!.id) },
            createdAt: {
              gte: new Date(`${days[0]}T00:00:00.000Z`),
              lte: new Date(`${days[days.length - 1]}T23:59:59.999Z`),
            },
          },
          select: { facilityRecordId: true, talkedTo: true, createdAt: true },
        })
      : [];
    const seen = new Set(
      existing.map((log) =>
        dedupeKey(
          log.facilityRecordId!,
          log.talkedTo,
          log.createdAt.toISOString().slice(0, 10)
        )
      )
    );

    const logs = found.flatMap((row) => {
      const key = dedupeKey(row.board!.id, row.talkedTo, row.date);
      if (seen.has(key)) return [];
      seen.add(key);
      return [
        {
          ...row,
          id: randomUUID(),
          recordId: row.board!.id,
          notes: row.notes || null,
          createdAt: atNoon(row.date, row.line),
        },
      ];
    });
    const result = {
      created: logs.length,
      duplicates: found.length - logs.length,
      missing,
      ids: dto.dryRun ? [] : logs.map((log) => log.id),
    };
    if (dto.dryRun || !logs.length) return result;

    // History reuses the log's id so an undo can remove both by the same ids.
    await prisma.$transaction(async (tx) => {
      await tx.marketing.createMany({
        data: logs.map((log) => ({
          id: log.id,
          facility: log.facility,
          touchpoints: log.touchpoints,
          talkedTo: log.talkedTo,
          notes: log.notes,
          memberId,
          userId,
          organizationId,
          facilityRecordId: log.recordId,
          createdAt: log.createdAt,
        })),
      });
      await tx.activity.createMany({
        data: logs.map((log) => ({
          ...toActivityFields(log),
          status: "COMPLETED" as const,
          completedAt: log.createdAt,
          createdAt: log.createdAt,
          recordId: log.recordId,
          marketingId: log.id,
          createdBy: userId,
          organizationId,
        })),
      });
      await tx.history.createMany({
        data: logs.map((log) => ({
          id: log.id,
          recordId: log.recordId,
          organizationId,
          column: "marketing",
          newValue: `Imported marketing log: ${log.touchpoints.join(", ")}, talked to ${log.talkedTo}${log.notes ? `, notes: ${log.notes}` : ""}, on ${log.date}`,
          createdBy: userId,
          action: "milestone_created",
          createdAt: log.createdAt,
        })),
      });
    });
    await purgeBoardCaches(organizationId);
    return result;
  }

  async undoMarketingImport(ids: string[], organizationId: string) {
    const removed = await prisma.$transaction(async (tx) => {
      // Only an imported log has a history entry under its own id, so a
      // hand-entered log can never be removed through this route.
      const imported = await tx.history.findMany({
        where: { id: { in: ids }, organizationId, column: "marketing" },
        select: { id: true },
      });
      const importedIds = imported.map((entry) => entry.id);
      const { count } = await tx.marketing.deleteMany({
        where: { id: { in: importedIds }, organizationId },
      });
      await tx.history.deleteMany({
        where: { id: { in: importedIds }, organizationId },
      });
      return count;
    });
    await purgeBoardCaches(organizationId);
    return { removed };
  }

  async importAccountManagers(dto: ImportAccountManagersDto, actor: Actor) {
    const { userId, organizationId } = actor;
    const [facilities, members] = await Promise.all([
      this.findFacilities(
        dto.rows.map((row) => row.facility),
        organizationId
      ),
      // Same rule as a single assignment: only roles liaison reports cover.
      prisma.member.findMany({
        where: {
          organizationId,
          role: { in: [...ACCOUNT_MANAGER_ROLES] },
          user: {
            email: { in: [...new Set(dto.rows.map((row) => row.email))] },
          },
        },
        select: { userId: true, user: { select: { email: true, name: true } } },
      }),
    ]);
    const byEmail = new Map(
      members.map((member) => [member.user.email.toLowerCase(), member])
    );

    const rows = dto.rows.map((row, index) => ({
      ...row,
      line: dto.firstRow + index,
      board: facilities.get(recordNameIndex(row.facility)),
      manager: byEmail.get(row.email),
    }));
    const missing: RowIssue[] = rows
      .filter((row) => !row.board)
      .map((row) => ({ row: row.line, value: row.facility }));
    const unknownManagers: RowIssue[] = rows
      .filter((row) => !row.manager)
      .map((row) => ({ row: row.line, value: row.email }));
    if ((missing.length || unknownManagers.length) && !dto.dryRun) {
      throw new BadRequestException(
        "Some facilities or account managers could not be matched"
      );
    }

    const assignments = rows.filter(
      (row) =>
        row.board && row.manager && row.board.assignedTo !== row.manager.userId
    );
    const result = {
      assigned: assignments.length,
      alreadySet: rows.filter(
        (row) =>
          row.board &&
          row.manager &&
          row.board.assignedTo === row.manager.userId
      ).length,
      missing,
      unknownManagers,
    };
    if (dto.dryRun || !assignments.length) return result;

    // One update per account manager, not per facility.
    const byManager = new Map<string, string[]>();
    for (const row of assignments) {
      const userId = row.manager!.userId;
      byManager.set(userId, [...(byManager.get(userId) ?? []), row.board!.id]);
    }
    await prisma.$transaction(async (tx) => {
      for (const [assignedTo, boardIds] of byManager) {
        await tx.board.updateMany({
          where: { id: { in: boardIds }, organizationId },
          data: { assignedTo },
        });
      }
      await tx.history.createMany({
        data: assignments.map((row) => ({
          recordId: row.board!.id,
          organizationId,
          column: "Assigned To",
          oldValue: row.board!.assignedUser?.name ?? "",
          newValue: row.manager!.user.name ?? "",
          createdBy: userId,
          action: "update",
        })),
      });
    });
    await purgeBoardCaches(organizationId);
    return result;
  }
}
