import type { MarketingAnalyticsResponse } from "@dashboard/shared";
import * as PDFDocument from "pdfkit";
import {
  LETTERHEAD_BOTTOM_INSET,
  LETTERHEAD_TOP_INSET,
  stampLetterhead,
} from "../../lib/documents/letterhead";

// Rendered server side rather than screenshotted in the browser. The old export
// pasted a html2canvas bitmap across A4 pages, which gave no letterhead, no
// selectable text and whatever the screen happened to look like. This draws the
// same numbers as a document.
const BRAND = "#0d3185";
const INK = "#1c1e26";
const MUTED = "#6b7280";
const RULE = "#dbe0e6";
const SIDE = 48;

type Report = MarketingAnalyticsResponse;

const dateLabel = (value: Date | undefined) =>
  value ? value.toISOString().slice(0, 10) : null;

export const renderLiaisonPerformancePdf = async (input: {
  organizationName: string;
  report: Report;
  startDate?: Date;
  endDate?: Date;
  liaisonName: string | null;
}): Promise<Buffer> => {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: {
      top: LETTERHEAD_TOP_INSET,
      bottom: LETTERHEAD_BOTTOM_INSET,
      left: SIDE,
      right: SIDE,
    },
    bufferPages: true,
  });

  const buffers: Buffer[] = [];
  const rendered = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });

  const width = doc.page.width - SIDE * 2;
  const floor = () => doc.page.height - LETTERHEAD_BOTTOM_INSET;

  const room = (needed: number) => {
    if (doc.y + needed > floor()) doc.addPage();
  };

  const heading = (text: string) => {
    room(40);
    doc.moveDown(0.6);
    doc.fontSize(13).fillColor(BRAND).text(text, SIDE, doc.y);
    doc
      .moveTo(SIDE, doc.y + 4)
      .lineTo(SIDE + width, doc.y + 4)
      .lineWidth(0.75)
      .strokeColor(RULE)
      .stroke();
    doc.moveDown(0.6);
  };

  const label = (text: string, value: string) => {
    room(18);
    doc.fontSize(9.5).fillColor(MUTED).text(text, SIDE, doc.y, {
      continued: true,
      width: width,
    });
    doc.fillColor(INK).text(`  ${value}`);
  };

  const bullets = (items: string[]) => {
    for (const item of items) {
      room(16);
      doc
        .fontSize(9.5)
        .fillColor(INK)
        .text(`•  ${item}`, SIDE + 6, doc.y, { width: width - 6 });
      doc.moveDown(0.15);
    }
  };

  // ── Cover block ─────────────────────────────────────────────
  const range =
    dateLabel(input.startDate) && dateLabel(input.endDate)
      ? `${dateLabel(input.startDate)} to ${dateLabel(input.endDate)}`
      : "All time";

  doc
    .fontSize(20)
    .fillColor(BRAND)
    .text("Liaison Performance", SIDE, LETTERHEAD_TOP_INSET);
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor(MUTED).text(input.organizationName, SIDE, doc.y);
  doc.moveDown(0.9);

  label("Period", range);
  label("Scope", input.liaisonName ?? "All liaisons");
  label("Generated", new Date().toISOString().slice(0, 10));

  heading("Organization totals");
  label("Referrals", String(input.report.totals.referrals));
  label("Admissions", String(input.report.totals.admissions));
  label(
    "Conversion",
    input.report.totals.referrals
      ? `${Math.round(
          (input.report.totals.admissions / input.report.totals.referrals) * 100
        )}%`
      : "n/a"
  );

  // ── Per liaison ─────────────────────────────────────────────
  if (!input.report.analytics.length) {
    heading("Liaisons");
    doc
      .fontSize(9.5)
      .fillColor(MUTED)
      .text("No liaison activity in this period.", SIDE, doc.y);
  }

  for (const liaison of input.report.analytics) {
    heading(liaison.memberName);

    label("Engagement", liaison.engagementLevel);
    label("Leads", `${liaison.totalLeads}  (${liaison.newLeads} new)`);
    label("Referrals", String(liaison.totalReferrals));
    label("Admissions", String(liaison.admissions));
    label("Interactions", String(liaison.totalInteractions));

    if (liaison.touchpointsUsed.length) {
      doc.moveDown(0.4);
      room(18);
      doc.fontSize(9.5).fillColor(MUTED).text("Touchpoints", SIDE, doc.y);
      doc.moveDown(0.2);
      bullets(
        liaison.touchpointsUsed.map(
          (touchpoint) =>
            `${touchpoint.type.replace(/_/g, " ").toLowerCase()} — ${touchpoint.count}`
        )
      );
    }

    if (liaison.facilitiesCovered.length) {
      doc.moveDown(0.3);
      room(18);
      doc
        .fontSize(9.5)
        .fillColor(MUTED)
        .text(
          `Facilities covered (${liaison.facilitiesCovered.length})`,
          SIDE,
          doc.y
        );
      doc.moveDown(0.2);
      room(30);
      doc
        .fontSize(9.5)
        .fillColor(INK)
        .text(liaison.facilitiesCovered.join(", "), SIDE + 6, doc.y, {
          width: width - 6,
        });
    }

    if (liaison.peopleContacted.length) {
      doc.moveDown(0.3);
      room(18);
      doc
        .fontSize(9.5)
        .fillColor(MUTED)
        .text(`Stakeholders (${liaison.peopleContacted.length})`, SIDE, doc.y);
      doc.moveDown(0.2);
      room(30);
      doc
        .fontSize(9.5)
        .fillColor(INK)
        .text(liaison.peopleContacted.join(", "), SIDE + 6, doc.y, {
          width: width - 6,
        });
    }
  }

  // ── AI analysis ─────────────────────────────────────────────
  const analysis = input.report.analysis;
  if (analysis) {
    const sections: [string, string[]][] = [
      ["Key insights", analysis.keyInsights],
      ["Strengths", analysis.strengths],
      ["Areas to improve", analysis.weaknesses],
      ["Recommendations", analysis.actionableRecommendations],
      ["Engagement optimizations", analysis.engagementOptimizations],
    ];

    for (const [title, items] of sections) {
      if (!items?.length) continue;
      heading(title);
      bullets(items);
    }
  }

  // Page numbers sit above the letterhead's footer band, not inside it.
  const pages = doc.bufferedPageRange();
  for (let index = 0; index < pages.count; index += 1) {
    doc.switchToPage(index);
    doc
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `Page ${index + 1} of ${pages.count}`,
        SIDE,
        doc.page.height - LETTERHEAD_BOTTOM_INSET + 12,
        { width, align: "center" }
      );
  }

  doc.end();

  // pdfkit cannot embed another PDF, so the artwork goes on afterwards.
  return Buffer.from(await stampLetterhead(await rendered));
};
