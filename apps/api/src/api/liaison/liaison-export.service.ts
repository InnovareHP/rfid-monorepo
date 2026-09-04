import { touchpointLabel } from "@dashboard/shared";
import { Injectable } from "@nestjs/common";
import { AuditService } from "../../lib/audit/audit.service";
import {
  csvFile,
  csvFilename,
  EXPORT_ROW_LIMIT,
  exportWindow,
} from "../../lib/documents/csv";
import { LiaisonService } from "./liaison.service";

export type ExportActor = {
  userId: string;
  organizationId: string;
  role: string | null;
  memberId: string | null;
  ip: string | null;
};

export type ExportRange = { from?: string; to?: string };

const isoDate = (value: Date | string) =>
  (value instanceof Date ? value.toISOString() : value)
    .replace("T", " ")
    .slice(0, 16);

// The report pages paged the read endpoint a hundred rows at a time and built
// the file in the browser, so an export looked like ordinary browsing and no
// row said it happened. Same numbers, assembled and logged once.
@Injectable()
export class LiaisonExportService {
  constructor(
    private readonly liaisonService: LiaisonService,
    private readonly audit: AuditService
  ) {}

  async exportMileageCsv(actor: ExportActor, range: ExportRange) {
    const window = exportWindow(range.from, range.to);
    const { data } = await this.liaisonService.getMillage(
      actor.memberId,
      {
        filter: {
          mileageDateFrom: window?.from,
          mileageDateTo: window?.to,
        },
        page: 1,
        limit: EXPORT_ROW_LIMIT,
      },
      actor.organizationId
    );

    const headers = [
      "Date",
      "Destination",
      "Counties Marketed",
      "Beginning Mileage",
      "Ending Mileage",
      "Total Miles",
      "Rate Type",
      "Rate Per Mile",
      "Reimbursement",
    ];

    const rows = data.map((row) => ({
      Date: isoDate(row.createdAt),
      Destination: row.destination,
      "Counties Marketed": row.countiesMarketed,
      "Beginning Mileage": row.beginningMileage,
      "Ending Mileage": row.endingMileage,
      "Total Miles": row.totalMiles,
      "Rate Type": row.rateType,
      "Rate Per Mile": row.ratePerMile,
      Reimbursement: row.reimbursementAmount,
    }));

    return this.file("mileage", "Mileage_Report", headers, rows, actor, range);
  }

  async exportMarketingCsv(actor: ExportActor, range: ExportRange) {
    const window = exportWindow(range.from, range.to);
    const { data } = await this.liaisonService.getMarketing(
      actor.memberId,
      {
        filter: {
          marketingDateFrom: window?.from,
          marketingDateTo: window?.to,
        },
        page: 1,
        limit: EXPORT_ROW_LIMIT,
      },
      actor.organizationId
    );

    const headers = [
      "Date",
      "Liaison",
      "Facility",
      "Touchpoints",
      "Talked To",
      "Reason For Visit",
      "Notes",
    ];

    const rows = data.map((row) => ({
      Date: isoDate(row.createdAt),
      Liaison: row.liaisonName ?? "",
      Facility: row.facility,
      Touchpoints: (row.touchpoints ?? []).map(touchpointLabel).join(", "),
      "Talked To": row.talkedTo,
      "Reason For Visit": row.reasonForVisit ?? "",
      Notes: row.notes ?? "",
    }));

    return this.file(
      "marketing",
      "Marketing_Report",
      headers,
      rows,
      actor,
      range
    );
  }

  async exportExpenseCsv(actor: ExportActor, range: ExportRange) {
    const window = exportWindow(range.from, range.to);
    const { data } = await this.liaisonService.getExpense(
      actor.memberId,
      {
        filter: {
          expenseDateFrom: window?.from,
          expenseDateTo: window?.to,
        },
        page: 1,
        limit: EXPORT_ROW_LIMIT,
      },
      actor.organizationId
    );

    const headers = [
      "Date",
      "Liaison",
      "Amount",
      "Description",
      "Notes",
      "Receipt",
    ];

    // The receipt is a direct file url, so the sheet says whether one exists
    // rather than handing every reader a link to it.
    const rows = data.map((row) => ({
      Date: isoDate(row.createdAt),
      Liaison: row.liaisonName ?? "",
      Amount: row.amount,
      Description: row.description ?? "",
      Notes: row.notes ?? "",
      Receipt: row.imageUrl ? "Yes" : "No",
    }));

    return this.file("expense", "Expense_Report", headers, rows, actor, range);
  }

  private async file(
    report: string,
    prefix: string,
    headers: string[],
    rows: Record<string, unknown>[],
    actor: ExportActor,
    range: ExportRange
  ) {
    await this.audit.record({
      actorUserId: actor.userId,
      actorOrgId: actor.organizationId,
      actorRole: actor.role,
      actorIp: actor.ip,
      action: `${report}.export`,
      resourceType: "Report",
      method: "GET",
      path: `/api/liaison/${report}/export`,
      metadata: {
        format: "csv",
        rows: rows.length,
        truncated: rows.length >= EXPORT_ROW_LIMIT,
        from: range.from ?? null,
        to: range.to ?? null,
        scope: actor.memberId ? "own" : "organization",
      },
    });

    return { csv: csvFile(headers, rows), filename: csvFilename(prefix) };
  }
}
