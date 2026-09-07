import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Logger } from "@nestjs/common";
import { PDFDocument } from "pdf-lib";

// Stamps the company letterhead behind every page of an already-rendered PDF.
// Taking finished bytes rather than a document means it works for anything that
// can produce a PDF - pdf-lib here, pdfkit in the liaison report - instead of
// each generator needing its own copy of the artwork.
//
// The letterhead is A4 (595 x 842). A page of another size is scaled to fit
// rather than stretched, so nothing is distorted, but the artwork is full bleed
// and a non-A4 page leaves white down both edges, so a document meant to carry
// the letterhead should be A4 to begin with.
//
// Only the header and footer bands are used. Cropping to them keeps the stamp
// independent of whatever the artwork puts between them.

// The artwork's own header and footer bands. Content drawn inside them collides
// with the logo or the footer strip, so a generator that stamps needs to keep
// clear of these. Measured off the image clip rects in the artwork's content
// stream (85.85 and 63.3, rounded out); adjust both if the artwork is
// replaced.
export const LETTERHEAD_TOP_INSET = 86;
export const LETTERHEAD_BOTTOM_INSET = 66;

const ARTWORK = { width: 595, height: 842 };

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
  const artworkBytes = load();
  if (!artworkBytes) return bytes;

  try {
    const [source, letterhead] = await Promise.all([
      PDFDocument.load(bytes),
      PDFDocument.load(artworkBytes),
    ]);

    // Composed into a fresh document rather than stamped onto the original.
    // drawPage appends to a page's content stream, so drawing the artwork onto
    // an existing page puts it over the text; the only way to get it behind is
    // to draw it first onto a new page and lay the original page on top.
    const output = await PDFDocument.create();
    const artwork = letterhead.getPage(0);

    // Only the two bands are taken, not the whole page, so anything the artwork
    // carries between them stays out of the document body.
    const [header, footer] = await Promise.all([
      output.embedPage(artwork, {
        left: 0,
        bottom: ARTWORK.height - LETTERHEAD_TOP_INSET,
        right: ARTWORK.width,
        top: ARTWORK.height,
      }),
      output.embedPage(artwork, {
        left: 0,
        bottom: 0,
        right: ARTWORK.width,
        top: LETTERHEAD_BOTTOM_INSET,
      }),
    ]);

    const contentPages = await output.embedPdf(source, source.getPageIndices());

    contentPages.forEach((content, index) => {
      const { width, height } = source.getPage(index).getSize();
      // Uniform scale, so the artwork keeps its proportions on a page that is
      // not A4 instead of being squashed to fit.
      const scale = Math.min(width / ARTWORK.width, height / ARTWORK.height);
      const page = output.addPage([width, height]);
      const inset = (width - ARTWORK.width * scale) / 2;

      page.drawPage(header, {
        width: ARTWORK.width * scale,
        height: LETTERHEAD_TOP_INSET * scale,
        x: inset,
        y: height - LETTERHEAD_TOP_INSET * scale,
      });

      page.drawPage(footer, {
        width: ARTWORK.width * scale,
        height: LETTERHEAD_BOTTOM_INSET * scale,
        x: inset,
        y: 0,
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
