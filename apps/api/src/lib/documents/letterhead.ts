import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Logger } from "@nestjs/common";
import { PDFDocument } from "pdf-lib";

// Stamps the company letterhead behind every page of an already-rendered PDF.
// Taking finished bytes rather than a document means it works for anything that
// can produce a PDF - pdf-lib here, pdfkit in the liaison report - instead of
// each generator needing its own copy of the artwork.
//
// The letterhead is US Letter (612 x 792). A page of another size is scaled to
// fit rather than stretched, so nothing is distorted, but a document meant to
// carry the letterhead should be Letter to begin with.

// The artwork's own header and footer bands. Content drawn inside them collides
// with the logo or the address block, so a generator that stamps needs to keep
// clear of these. Measured against the supplied file; adjust both if the
// artwork is replaced.
export const LETTERHEAD_TOP_INSET = 108;
export const LETTERHEAD_BOTTOM_INSET = 72;

const LETTER = { width: 612, height: 792 };

// dist keeps the same layout as src because nest-cli copies assets across, so
// one relative path serves both the compiled and the ts-node case.
const CANDIDATES = [
  join(__dirname, "../../assets/letterhead.pdf"),
  join(process.cwd(), "src/assets/letterhead.pdf"),
  join(process.cwd(), "dist/assets/letterhead.pdf"),
];

let cached: Uint8Array | null | undefined;

const load = (): Uint8Array | null => {
  if (cached !== undefined) return cached;

  const found = CANDIDATES.find((path) => existsSync(path));

  if (!found) {
    new Logger("letterhead").warn(
      `No letterhead found at ${CANDIDATES.join(", ")}; documents render plain`
    );
    cached = null;
    return cached;
  }

  cached = new Uint8Array(readFileSync(found));
  return cached;
};

// Never throws: an unbranded document is worth more to whoever asked for it
// than a failed download, so a missing or unreadable letterhead is logged and
// the original bytes are returned.
export const stampLetterhead = async (
  bytes: Uint8Array
): Promise<Uint8Array> => {
  const artwork = load();
  if (!artwork) return bytes;

  try {
    const [source, letterhead] = await Promise.all([
      PDFDocument.load(bytes),
      PDFDocument.load(artwork),
    ]);

    // Composed into a fresh document rather than stamped onto the original.
    // drawPage appends to a page's content stream, so drawing the artwork onto
    // an existing page puts it over the text; the only way to get it behind is
    // to draw it first onto a new page and lay the original page on top.
    const output = await PDFDocument.create();
    const [artworkPage] = await output.embedPdf(letterhead, [0]);
    const contentPages = await output.embedPdf(source, source.getPageIndices());

    contentPages.forEach((content, index) => {
      const { width, height } = source.getPage(index).getSize();
      // Uniform scale, so the artwork keeps its proportions on a page that is
      // not Letter instead of being squashed to fit.
      const scale = Math.min(width / LETTER.width, height / LETTER.height);
      const page = output.addPage([width, height]);

      page.drawPage(artworkPage, {
        width: LETTER.width * scale,
        height: LETTER.height * scale,
        x: (width - LETTER.width * scale) / 2,
        y: (height - LETTER.height * scale) / 2,
      });

      page.drawPage(content, { x: 0, y: 0, width, height });
    });

    return await output.save();
  } catch (error) {
    new Logger("letterhead").error(
      "Could not stamp the letterhead; returning the plain document",
      error as Error
    );
    return bytes;
  }
};
