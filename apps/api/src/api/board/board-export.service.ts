import { Injectable } from "@nestjs/common";
import { AuditService } from "../../lib/audit/audit.service";
import { prisma } from "../../lib/prisma/prisma";
import { BoardService } from "./board.service";

// Matches papaparse defaults, which produced the file until now: CRLF rows, and
// a field quoted only when it contains a delimiter, a quote or a newline.
const QUOTE_IF = /[",\r\n]/;

// A LOCATION or TIMELINE value arrives as an object, and the default
// stringification would write "[object Object]" into the cell.
const text = (value: unknown): string => {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
      return String(value);
    case "object":
      return JSON.stringify(value);
    default:
      return "";
  }
};

const cell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const rendered = text(value);
  if (!QUOTE_IF.test(rendered)) return rendered;
  return `"${rendered.replace(/"/g, '""')}"`;
};

const toCsv = (headers: string[], rows: Record<string, unknown>[]): string =>
  [
    headers.map(cell).join(","),
    ...rows.map((row) => headers.map((h) => cell(row[h])).join(",")),
  ].join("\r\n");

// Excel reads a UTF-8 csv as latin-1 without it, which mangles every accented name.
const BOM = "\uFEFF";

// A ceiling so one request cannot pull an unbounded result set into memory. Above
// this the caller has to narrow the date range.
export const EXPORT_ROW_LIMIT = 50_000;

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
    const isReferral = request.moduleType === "REFERRAL";

    const result: any = await this.boardService.getAllBoards(organizationId, {
      ...request,
      page: 1,
      limit: EXPORT_ROW_LIMIT,
    } as any);

    const data: Record<string, unknown>[] = result.data ?? [];
    const columns: { name: string }[] = result.columns ?? [];

    const headers = [
      ...(isReferral ? [] : ["Organization", "Account Manager"]),
      ...columns.filter((c) => c.name !== "History").map((c) => c.name),
    ];

    const names = isReferral
      ? new Map<string, string>()
      : await this.memberNames(organizationId);

    const rows = data.map((row) => {
      const out: Record<string, unknown> = {};

      if (!isReferral) {
        const assignedTo = row["assigned_to"];
        out["Organization"] = row["referral_name"] ?? "";
        out["Account Manager"] =
          typeof assignedTo === "string" ? (names.get(assignedTo) ?? "") : "";
      }

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
    const prefix = isReferral ? "Referrals" : "Master_Leads";

    return {
      csv: BOM + toCsv(headers, rows),
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
