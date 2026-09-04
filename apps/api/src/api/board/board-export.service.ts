import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../lib/audit/audit.service";
import { csvFile, EXPORT_ROW_LIMIT } from "../../lib/documents/csv";
import { prisma } from "../../lib/prisma/prisma";
import { BoardService } from "./board.service";

export interface ExportRequest {
  moduleType: string;
  boardDateFrom?: string;
  boardDateTo?: string;
  search?: string;
  filter?: unknown;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

@Injectable()
export class BoardExportService {
  constructor(
    private readonly boardService: BoardService,
    private readonly audit: AuditService
  ) {}

  async exportCsv(
    organizationId: string,
    request: ExportRequest,
    actor: { userId: string; role: string | null; ip: string | null }
  ): Promise<{ csv: string; rows: number; filename: string }> {
    // Every module exports, so the name column is headed by whatever this
    // organization calls one of its records rather than a hardcoded label.
    const board = await prisma.module.findFirst({
      where: { key: request.moduleType, organizationId },
      select: { label: true, labelSingular: true },
    });

    if (!board) {
      throw new NotFoundException(
        `No module "${request.moduleType}" for the active organization`
      );
    }

    const result: any = await this.boardService.getAllBoards(organizationId, {
      ...request,
      page: 1,
      limit: EXPORT_ROW_LIMIT,
    } as any);

    const data: Record<string, unknown>[] = result.data ?? [];
    const columns: { name: string }[] = result.columns ?? [];

    const nameHeader = board.labelSingular;
    const ASSIGNEE_HEADER = "Account Manager";

    // A module can own a field named the same as its own label (REFERRAL has a
    // "Facility" field), and a duplicated header would drop one of the two.
    const headers = [
      nameHeader,
      ASSIGNEE_HEADER,
      ...columns
        .filter((c) => c.name !== "History")
        .map((c) => c.name)
        .filter((name) => name !== nameHeader && name !== ASSIGNEE_HEADER),
    ];

    const names = await this.memberNames(organizationId);

    const rows = data.map((row) => {
      const out: Record<string, unknown> = {};

      // recordName and assignedTo are what getAllBoards puts on a flat row.
      const assignedTo = row["assignedTo"];
      out[nameHeader] = row["recordName"] ?? "";
      out[ASSIGNEE_HEADER] =
        typeof assignedTo === "string" ? (names.get(assignedTo) ?? "") : "";

      for (const header of headers) {
        if (header in out) continue;
        out[header] = row[header] ?? "";
      }

      return out;
    });

    // The point of moving this server side: one row that says an export happened,
    // how much left, and under which filters. Fifty paginated reads said none of that.
    await this.audit.record({
      actorUserId: actor.userId,
      actorOrgId: organizationId,
      actorRole: actor.role,
      actorIp: actor.ip,
      action: "board.export",
      resourceType: "Board",
      metadata: {
        moduleType: request.moduleType,
        rows: rows.length,
        truncated: rows.length >= EXPORT_ROW_LIMIT,
        boardDateFrom: request.boardDateFrom ?? null,
        boardDateTo: request.boardDateTo ?? null,
        search: request.search ? "[redacted]" : null,
      },
    });

    const stamp = new Date().toISOString().split("T")[0];
    const prefix = board.label.replace(/[^a-zA-Z0-9]+/g, "_");

    return {
      csv: csvFile(headers, rows),
      rows: rows.length,
      filename: `${prefix}_${stamp}.csv`,
    };
  }

  // assigned_to holds a user id, and the frontend resolved it through the same
  // options list it renders the assignee picker from.
  private async memberNames(
    organizationId: string
  ): Promise<Map<string, string>> {
    const members = await prisma.member.findMany({
      where: { organizationId },
      select: { userId: true, user: { select: { name: true } } },
    });

    return new Map(members.map((m) => [m.userId, m.user?.name ?? ""]));
  }
}
