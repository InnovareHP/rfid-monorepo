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

const PAGE = { width: 612, height: 792 };
const MARGIN = 56;
const BODY_SIZE = 10;
const LINE_GAP = 4;

// The party blanks a blank copy shows, so a reader can see what they will fill.
const BLANK_PARTY: BaaParty = {
  companyLegalName: "[ORGANIZATION LEGAL NAME]",
  companyJurisdiction: "[STATE]",
  companyEntityType: "[ENTITY TYPE]",
  companyAddress: "[PRINCIPAL OFFICE ADDRESS]",
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
    y: PAGE.height - MARGIN,
  };
}

// Draws wrapped text, breaking to a new page when the block runs past the
// bottom margin, and returns the cursor the next block starts from.
function drawBlock(
  doc: PDFDocument,
  cursor: Cursor,
  text: string,
  font: PDFFont,
  size: number
): Cursor {
  const width = PAGE.width - MARGIN * 2;
  let { page, y } = cursor;

  for (const line of wrap(text, font, size, width)) {
    if (y < MARGIN + size) ({ page, y } = newPage(doc));
    page.drawText(line, { x: MARGIN, y, size, font });
    y -= size + LINE_GAP;
  }

  return { page, y };
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
  cursor.page.drawText("HIPAA BUSINESS ASSOCIATE AGREEMENT", {
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
    if (cursor.y < MARGIN + 60) cursor = newPage(doc);
    cursor.page.drawText(section.heading, {
      x: MARGIN,
      y: cursor.y,
      size: 11,
      font: bold,
    });
    cursor.y -= 16;
    cursor = drawBlock(doc, cursor, section.body, font, BODY_SIZE);
    cursor.y -= 10;
  }

  if (execution) await drawExecutionPage(doc, font, bold, execution);

  return Buffer.from(await doc.save());
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
    `The parties have executed this Business Associate Agreement, version ${BAA_VERSION}, as of ${signedOn}.`,
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
