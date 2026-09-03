import {
  BAA_ACKNOWLEDGEMENT,
  BAA_SECTIONS,
  BAA_VERSION,
  BaaParty,
  buildBaaPreamble,
  VENDOR_LEGAL_NAME,
  VENDOR_SIGNATORY,
} from "@dashboard/shared";
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import {
  LETTERHEAD_BOTTOM_INSET,
  LETTERHEAD_TOP_INSET,
  stampLetterhead,
} from "./letterhead";

const PAGE = { width: 612, height: 792 };
const MARGIN = 56;
// The letterhead owns the top and bottom of the page, so body text starts and
// stops inside those bands rather than at the plain margin.
const TOP_LIMIT = PAGE.height - LETTERHEAD_TOP_INSET;
const BOTTOM_LIMIT = LETTERHEAD_BOTTOM_INSET;
const BODY_SIZE = 10;
const LINE_GAP = 4;

// The party blanks a blank copy shows, so a reader can see what they will fill.
const BLANK_PARTY: BaaParty = {
  companyLegalName: "[______________________________]",
  companyJurisdiction: "[_______________]",
  companyEntityType: "[corporation / limited liability company / other]",
  companyAddress: "[_____________________________________]",
};

export type ExecutionDetails = {
  party: BaaParty;
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  organizationName: string;
  signatureImage?: string;
  ipAddress?: string | null;
  signedAt: Date;
};

type Cursor = { page: PDFPage; y: number };

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let current = "";

  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function newPage(doc: PDFDocument): Cursor {
  return {
    page: doc.addPage([PAGE.width, PAGE.height]),
    y: TOP_LIMIT,
  };
}

// Draws wrapped text, breaking to a new page when the block runs past the
// bottom margin, and returns the cursor the next block starts from.
function drawBlock(
  doc: PDFDocument,
  cursor: Cursor,
  text: string,
  font: PDFFont,
  size: number,
  indent = 0
): Cursor {
  const width = PAGE.width - MARGIN * 2 - indent;
  let { page, y } = cursor;

  // A body may carry its own paragraph breaks; each wraps independently.
  for (const [index, paragraph] of text.split("\n").entries()) {
    if (index > 0) y -= LINE_GAP * 2;

    for (const line of wrap(paragraph, font, size, width)) {
      if (y < BOTTOM_LIMIT + size) ({ page, y } = newPage(doc));
      page.drawText(line, { x: MARGIN + indent, y, size, font });
      y -= size + LINE_GAP;
    }
  }

  return { page, y };
}

// Bullet sits in the left margin gutter so wrapped lines stay aligned.
function drawBullet(
  doc: PDFDocument,
  cursor: Cursor,
  text: string,
  font: PDFFont,
  size: number
): Cursor {
  let { page, y } = cursor;
  if (y < BOTTOM_LIMIT + size * 2) ({ page, y } = newPage(doc));

  page.drawText("•", { x: MARGIN + 6, y, size, font });
  return drawBlock(doc, { page, y }, text, font, size, 18);
}

function drawSignatureBlock(
  page: PDFPage,
  y: number,
  label: string,
  name: string,
  title: string,
  date: string,
  font: PDFFont,
  bold: PDFFont
) {
  page.drawText(label, { x: MARGIN, y, size: 10, font: bold });
  const lineY = y - 78;

  page.drawLine({
    start: { x: MARGIN, y: lineY },
    end: { x: MARGIN + 240, y: lineY },
    thickness: 0.75,
    color: rgb(0.4, 0.4, 0.4),
  });

  let row = lineY - 16;
  for (const entry of [`Name: ${name}`, `Title: ${title}`, `Date: ${date}`]) {
    page.drawText(entry, { x: MARGIN, y: row, size: 9, font });
    row -= 13;
  }

  return row - 10;
}

async function drawSignatureImage(
  doc: PDFDocument,
  page: PDFPage,
  y: number,
  image: string
) {
  // A signature that will not embed must not fail the signing request, so the
  // block falls back to the ruled line and the typed name below it.
  try {
    const png = await doc.embedPng(image);
    const scaled = png.scale(Math.min(220 / png.width, 70 / png.height));
    page.drawImage(png, {
      x: MARGIN,
      y: y - 74,
      width: scaled.width,
      height: scaled.height,
    });
  } catch {
    return;
  }
}

async function buildDocument(execution?: ExecutionDetails) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const party = execution?.party ?? BLANK_PARTY;

  let cursor = newPage(doc);
  cursor.page.drawText("HIPAA BUSINESS ASSOCIATE ADDENDUM", {
    x: MARGIN,
    y: cursor.y,
    size: 15,
    font: bold,
  });
  cursor.y -= 22;

  cursor = drawBlock(doc, cursor, `Version ${BAA_VERSION}`, font, 9);
  cursor.y -= 10;

  cursor = drawBlock(doc, cursor, buildBaaPreamble(party), font, BODY_SIZE);
  cursor.y -= 12;

  for (const section of BAA_SECTIONS) {
    if (cursor.y < BOTTOM_LIMIT + 60) cursor = newPage(doc);
    cursor.page.drawText(section.heading, {
      x: MARGIN,
      y: cursor.y,
      size: 11,
      font: bold,
    });
    cursor.y -= 16;
    cursor = drawBlock(doc, cursor, section.body, font, BODY_SIZE);

    for (const item of section.items ?? []) {
      cursor.y -= 4;
      cursor = drawBullet(doc, cursor, item, font, BODY_SIZE);
    }

    cursor.y -= 10;
  }

  if (execution) await drawExecutionPage(doc, font, bold, execution);

  // Branded last, so the artwork sits behind everything drawn above and the
  // layout code stays unaware of it.
  return Buffer.from(await stampLetterhead(await doc.save()));
}

async function drawExecutionPage(
  doc: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  execution: ExecutionDetails
) {
  let cursor = newPage(doc);
  const signedOn = execution.signedAt.toISOString().slice(0, 10);

  cursor.page.drawText("Execution Page", {
    x: MARGIN,
    y: cursor.y,
    size: 14,
    font: bold,
  });
  cursor.y -= 24;

  cursor = drawBlock(
    doc,
    cursor,
    `The parties have executed this Business Associate Addendum, version ${BAA_VERSION}, as of ${signedOn}.`,
    font,
    BODY_SIZE
  );
  cursor.y -= 14;

  cursor = drawBlock(doc, cursor, BAA_ACKNOWLEDGEMENT, font, 9);
  cursor.y -= 24;

  if (execution.signatureImage) {
    await drawSignatureImage(
      doc,
      cursor.page,
      cursor.y,
      execution.signatureImage
    );
  }

  let y = drawSignatureBlock(
    cursor.page,
    cursor.y,
    "COVERED ENTITY",
    execution.signerName,
    execution.signerTitle,
    signedOn,
    font,
    bold
  );

  y -= 16;
  y = drawSignatureBlock(
    cursor.page,
    y,
    "BUSINESS ASSOCIATE",
    VENDOR_SIGNATORY.name,
    VENDOR_SIGNATORY.title,
    signedOn,
    font,
    bold
  );

  const footer = [
    `Organization: ${execution.organizationName}`,
    `Legal entity: ${execution.party.companyLegalName}`,
    `Signer: ${execution.signerEmail}`,
    `Signed at: ${execution.signedAt.toISOString()}`,
    `IP address: ${execution.ipAddress ?? "not recorded"}`,
    `Vendor: ${VENDOR_LEGAL_NAME}`,
    `Agreement version: ${BAA_VERSION}`,
  ];

  let row = Math.max(y - 24, MARGIN + footer.length * 11);
  for (const line of footer) {
    cursor.page.drawText(line, {
      x: MARGIN,
      y: row,
      size: 8,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });
    row -= 11;
  }
}

let blankDocument: Buffer | null = null;

// The blank copy is identical for every org and every request, so it is
// rendered once per process.
export const renderBlankBaa = async () => {
  if (!blankDocument) blankDocument = await buildDocument();
  return blankDocument;
};

export const renderExecutedBaa = (execution: ExecutionDetails) =>
  buildDocument(execution);
