import * as PDFDocument from "pdfkit";
import {
  LETTERHEAD_BOTTOM_INSET,
  LETTERHEAD_TOP_INSET,
  stampLetterhead,
} from "./letterhead";

// The layout toolkit every analytics export draws with, so the four reports
// share one set of tables, headings and spacing instead of each inventing its
// own. Rendered server side rather than screenshotted, which is what gives the
// download its letterhead and selectable text.
const BRAND = "#0d3185";
const INK = "#1c1e26";
const MUTED = "#6b7280";
const RULE = "#dbe0e6";
const HEADER_BG = "#eef2f9";
const ZEBRA = "#f8fafc";
const SIDE = 48;

const ROW_HEIGHT = 18;
const HEADER_HEIGHT = 20;
const LIST_ROW = 13;

export type Column = {
  header: string;
  width: number;
  align?: "left" | "right";
};

export const num = (value: number) => value.toLocaleString("en-US");

// A rate needs both halves to mean anything, so no denominator prints as a dash
// rather than a confident zero.
export const rate = (part: number, whole: number) =>
  whole ? `${Math.round((part / whole) * 100)}%` : "—";

export const percent = (value: number) => `${Math.round(value)}%`;

export const longDate = (value: Date) =>
  value.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

// Enum keys (PHONE_CALL, IN_PERSON_VISIT) belong in a database, not on a page
// someone hands to a director.
export const titleCase = (value: string) =>
  value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

export const periodLabel = (start?: Date, end?: Date) =>
  start && end ? `${longDate(start)} — ${longDate(end)}` : "All time";

export const createReport = (input: {
  title: string;
  organizationName: string;
  meta: { label: string; value: string }[];
}) => {
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

  // pdfkit wraps to the given width even with lineBreak off, which pushes a
  // long name onto a second line and through the row rule. Cells are measured
  // and cut instead, so a row is always one line.
  const fit = (text: string, cellWidth: number) => {
    if (doc.widthOfString(text) <= cellWidth) return text;

    let cut = text;
    while (cut.length > 1 && doc.widthOfString(`${cut}…`) > cellWidth) {
      cut = cut.slice(0, -1);
    }

    return `${cut.trimEnd()}…`;
  };

  const spanOf = (columns: Column[]) =>
    columns.reduce((total, column) => total + column.width, 0);

  const sectionTitle = (text: string) => {
    room(48);
    doc.moveDown(0.9);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND);
    doc.text(text.toUpperCase(), SIDE, doc.y, { characterSpacing: 0.6 });
    doc
      .moveTo(SIDE, doc.y + 4)
      .lineTo(SIDE + width, doc.y + 4)
      .lineWidth(0.75)
      .strokeColor(RULE)
      .stroke();
    doc.moveDown(0.7);
  };

  const subTitle = (text: string, caption?: string) => {
    room(46);
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(INK);
    doc.text(text, SIDE, doc.y, { width });

    if (caption) {
      doc.font("Helvetica").fontSize(9).fillColor(MUTED);
      doc.text(caption, SIDE, doc.y, { width });
    }

    doc.moveDown(0.4);
  };

  const note = (text: string) => {
    room(20);
    doc.font("Helvetica").fontSize(9.5).fillColor(MUTED);
    doc.text(text, SIDE, doc.y, { width });
    doc.moveDown(0.3);
  };

  // Cover metadata: the value column starts at a fixed offset so the rows line
  // up instead of trailing their labels.
  const metaRow = (labelText: string, value: string) => {
    const y = doc.y;
    doc.font("Helvetica").fontSize(9.5).fillColor(MUTED);
    doc.text(labelText.toUpperCase(), SIDE, y, {
      width: 78,
      characterSpacing: 0.4,
    });
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK);
    doc.text(value, SIDE + 86, y, { width: width - 86 });
    doc.y = y + 15;
  };

  // Headline figures as equal cards, which is what a reader looks at first and
  // what a list of labels buries.
  const statBand = (stats: { label: string; value: string }[]) => {
    if (!stats.length) return;

    const height = 54;
    room(height + 10);

    const gap = 10;
    const boxWidth = (width - gap * (stats.length - 1)) / stats.length;
    const top = doc.y;

    stats.forEach((stat, index) => {
      const x = SIDE + index * (boxWidth + gap);
      doc.rect(x, top, boxWidth, height).fill(HEADER_BG);
      doc.font("Helvetica-Bold").fontSize(19).fillColor(BRAND);
      doc.text(fit(stat.value, boxWidth - 8), x, top + 12, {
        width: boxWidth,
        align: "center",
        lineBreak: false,
      });
      doc.font("Helvetica").fontSize(8).fillColor(MUTED);
      doc.text(stat.label.toUpperCase(), x, top + 36, {
        width: boxWidth,
        align: "center",
        characterSpacing: 0.5,
      });
    });

    doc.y = top + height + 6;
  };

  const tableHeader = (columns: Column[]) => {
    const top = doc.y;
    doc.rect(SIDE, top, spanOf(columns), HEADER_HEIGHT).fill(HEADER_BG);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BRAND);

    let x = SIDE;
    for (const column of columns) {
      const cell = column.width - 16;
      doc.text(fit(column.header.toUpperCase(), cell), x + 8, top + 7, {
        width: cell,
        align: column.align ?? "left",
        lineBreak: false,
      });
      x += column.width;
    }

    doc.y = top + HEADER_HEIGHT;
  };

  // Rows are single line and cut with an ellipsis: a report whose columns stay
  // put is easier to read than one that reflows around a long name.
  const table = (columns: Column[], rows: string[][]) => {
    const span = spanOf(columns);

    room(HEADER_HEIGHT + ROW_HEIGHT * 2);
    tableHeader(columns);

    rows.forEach((row, index) => {
      if (doc.y + ROW_HEIGHT > floor()) {
        doc.addPage();
        tableHeader(columns);
      }

      const top = doc.y;
      if (index % 2 === 1) doc.rect(SIDE, top, span, ROW_HEIGHT).fill(ZEBRA);

      let x = SIDE;
      columns.forEach((column, columnIndex) => {
        const cell = column.width - 16;
        doc
          .font(columnIndex === 0 ? "Helvetica-Bold" : "Helvetica")
          .fontSize(9)
          .fillColor(INK);
        doc.text(fit(row[columnIndex] ?? "", cell), x + 8, top + 5, {
          width: cell,
          align: column.align ?? "left",
          lineBreak: false,
        });
        x += column.width;
      });

      doc
        .moveTo(SIDE, top + ROW_HEIGHT)
        .lineTo(SIDE + span, top + ROW_HEIGHT)
        .lineWidth(0.5)
        .strokeColor(RULE)
        .stroke();

      doc.y = top + ROW_HEIGHT;
    });

    doc.y += 6;
  };

  // Hanging indent, so a wrapped line starts under the text and not under the
  // bullet.
  const bullets = (items: string[]) => {
    for (const item of items) {
      room(20);
      const top = doc.y;
      doc.font("Helvetica").fontSize(9.5).fillColor(MUTED);
      doc.text("•", SIDE + 4, top, { width: 10, lineBreak: false });
      doc.fillColor(INK);
      doc.text(item, SIDE + 18, top, { width: width - 18, align: "left" });
      doc.moveDown(0.35);
    }
  };

  // Names run down aligned columns rather than into one dot-separated
  // paragraph, where a name ends mid-line and the next starts on the same line
  // with nothing between them but a middot.
  const columnList = (title: string, items: string[]) => {
    if (!items.length) return;

    room(40);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED);
    doc.text(`${title.toUpperCase()} (${items.length})`, SIDE, doc.y, {
      characterSpacing: 0.5,
    });
    doc.moveDown(0.35);

    // Column count follows the longest name, so short lists sit in three tidy
    // columns and long facility names get the room they need.
    doc.font("Helvetica").fontSize(9).fillColor(INK);
    const longest = Math.max(...items.map((item) => doc.widthOfString(item)));
    const count = Math.min(3, Math.max(1, Math.floor(width / (longest + 26))));
    const columnWidth = width / count;
    const rows = Math.ceil(items.length / count);

    for (let row = 0; row < rows; row += 1) {
      if (doc.y + LIST_ROW > floor()) doc.addPage();
      const top = doc.y;

      for (let column = 0; column < count; column += 1) {
        const item = items[row * count + column];
        if (!item) continue;

        const x = SIDE + column * columnWidth;
        doc.font("Helvetica").fontSize(9).fillColor(MUTED);
        doc.text("•", x, top, { width: 8, lineBreak: false });
        doc.fillColor(INK);
        doc.text(fit(item, columnWidth - 22), x + 10, top, {
          width: columnWidth - 22,
          lineBreak: false,
        });
      }

      doc.y = top + LIST_ROW;
    }

    doc.y += 6;
  };

  // Title block, drawn before the caller adds anything of its own.
  doc
    .font("Helvetica-Bold")
    .fontSize(21)
    .fillColor(BRAND)
    .text(input.title, SIDE, LETTERHEAD_TOP_INSET, { width });
  doc.moveDown(0.25);
  doc
    .font("Helvetica")
    .fontSize(10.5)
    .fillColor(MUTED)
    .text(input.organizationName, SIDE, doc.y, { width });
  doc.moveDown(1);

  for (const row of input.meta) metaRow(row.label, row.value);

  const finish = async (): Promise<Buffer> => {
    // Page numbers sit above the letterhead's footer band, not inside it. The
    // footer is below the bottom margin, and pdfkit answers text past the
    // margin by starting another page, so the margin is dropped first.
    const pages = doc.bufferedPageRange();
    for (let index = 0; index < pages.count; index += 1) {
      doc.switchToPage(index);
      doc.page.margins.bottom = 0;
      doc.font("Helvetica").fontSize(8).fillColor(MUTED);
      doc.text(
        `${input.organizationName}  ·  ${input.title}  ·  Page ${index + 1} of ${
          pages.count
        }`,
        SIDE,
        doc.page.height - LETTERHEAD_BOTTOM_INSET + 12,
        { width, align: "center" }
      );
    }

    doc.end();

    // pdfkit cannot embed another PDF, so the artwork goes on afterwards.
    return Buffer.from(await stampLetterhead(await rendered));
  };

  return {
    doc,
    width,
    bullets,
    columnList,
    finish,
    note,
    room,
    sectionTitle,
    statBand,
    subTitle,
    table,
  };
};

// Every breakdown in the analytics payloads is the same shape: a label, a
// count, and a share of the whole.
export const breakdownTable = (
  report: ReturnType<typeof createReport>,
  label: string,
  rows: { name: string; count: number }[],
  options?: { limit?: number }
) => {
  const limit = options?.limit ?? 25;
  if (!rows.length) {
    report.note("No data in this period.");
    return;
  }

  const ranked = [...rows].sort((a, b) => b.count - a.count);
  const total = ranked.reduce((sum, row) => sum + row.count, 0);
  const shown = ranked.slice(0, limit);

  report.table(
    [
      { header: label, width: 300 },
      { header: "Count", width: 108, align: "right" },
      { header: "Share", width: 108, align: "right" },
    ],
    shown.map((row) => [row.name, num(row.count), rate(row.count, total)])
  );

  if (ranked.length > shown.length) {
    report.note(`${ranked.length - shown.length} more not shown.`);
  }
};
