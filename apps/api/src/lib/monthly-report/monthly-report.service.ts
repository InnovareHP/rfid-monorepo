import { Injectable, Logger } from "@nestjs/common";
import { appConfig } from "../../config/app-config";
import { getOrganizationEntitlement } from "../../guard/subscription/subscription.guard";
import { sendRawHtmlEmail } from "../aws/ses";
import { prisma } from "../prisma/prisma";
import { runUnscoped, runWithTenant } from "../prisma/tenant-context";

type ModuleTotal = { label: string; created: number; total: number };

@Injectable()
export class MonthlyReportService {
  private readonly logger = new Logger(MonthlyReportService.name);

  // Runs outside any request, so the organization loop opens its own tenant
  // scope rather than relying on a session.
  async run() {
    const organizations = await runUnscoped(() =>
      prisma.organization.findMany({ select: { id: true, name: true } })
    );

    let sent = 0;

    for (const organization of organizations) {
      const entitlement = await getOrganizationEntitlement(organization.id);

      // The monthly report is part of custom reporting, so it follows the same
      // entitlement rather than testing the plan name.
      if (!entitlement.features.includes("custom_reporting")) continue;

      const recipients = await this.ownerEmails(organization.id);
      if (!recipients.length) continue;

      const totals = await runWithTenant(organization.id, () =>
        this.moduleTotals(organization.id)
      );

      if (!totals.length) continue;

      await Promise.all(
        recipients.map((to) =>
          sendRawHtmlEmail({
            to,
            from: appConfig.SES_FROM_EMAIL,
            subject: `${organization.name} — last month in review`,
            html: this.renderHtml(organization.name, totals),
          })
        )
      );

      sent += 1;
    }

    this.logger.log(`Monthly report sent for ${sent} organization(s)`);

    return { organizations: organizations.length, sent };
  }

  private async ownerEmails(organizationId: string) {
    const owners = await runUnscoped(() =>
      prisma.member.findMany({
        where: { organizationId, role: "owner" },
        select: { user: { select: { email: true } } },
      })
    );

    return owners.map((member) => member.user.email).filter(Boolean);
  }

  private async moduleTotals(organizationId: string): Promise<ModuleTotal[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - 1);

    const modules = await prisma.module.findMany({
      where: { organizationId, isArchived: false },
      orderBy: { moduleOrder: "asc" },
      select: { id: true, label: true },
    });

    return Promise.all(
      modules.map(async (module) => {
        const [created, total] = await Promise.all([
          prisma.board.count({
            where: {
              organizationId,
              moduleId: module.id,
              isDeleted: false,
              createdAt: { gte: since },
            },
          }),
          prisma.board.count({
            where: { organizationId, moduleId: module.id, isDeleted: false },
          }),
        ]);

        return { label: module.label, created, total };
      })
    );
  }

  // Counts only. No record names or field values leave the org, so the email
  // carries nothing that would be PHI.
  private renderHtml(organizationName: string, totals: ModuleTotal[]) {
    const rows = totals
      .map(
        (total) =>
          `<tr><td style="padding:8px 12px">${total.label}</td>` +
          `<td style="padding:8px 12px;text-align:right">${total.created}</td>` +
          `<td style="padding:8px 12px;text-align:right">${total.total}</td></tr>`
      )
      .join("");

    return `<div style="font-family:system-ui,sans-serif;color:#202020">
  <h2>${organizationName}</h2>
  <p>Here is what moved in the last month.</p>
  <table style="border-collapse:collapse;width:100%;max-width:520px">
    <thead>
      <tr style="background:#f4f9ff">
        <th style="padding:8px 12px;text-align:left">Module</th>
        <th style="padding:8px 12px;text-align:right">Added</th>
        <th style="padding:8px 12px;text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
  }
}
