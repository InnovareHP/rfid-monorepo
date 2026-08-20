import { escapeHtml, sanitizeRichText } from "@dashboard/shared";
import { z } from "zod";
import { blastBlockSchema } from "./dto/blast.schema";

export { applyMergeVariables, sanitizeRichText } from "@dashboard/shared";

export type BlastBlock = z.infer<typeof blastBlockSchema>;

type TextStyle = NonNullable<
  Extract<BlastBlock, { type: "TEXT" }>["props"]["bodyStyle"]
>;

const styleToCss = (style: TextStyle | undefined, fallbackSize: number) =>
  [
    `font-family:${style?.fontFamily ?? "Arial, Helvetica, sans-serif"}`,
    `font-size:${style?.fontSize ?? fallbackSize}px`,
    `color:${style?.color ?? "#202020"}`,
    `text-align:${style?.align ?? "center"}`,
    "margin:0",
  ].join(";");

const surfaceCss = (props: {
  backgroundColor?: string;
  backgroundImage?: string;
}) => {
  const declarations = ["padding:24px"];
  if (props.backgroundColor) {
    declarations.push(`background-color:${props.backgroundColor}`);
  }
  if (props.backgroundImage) {
    declarations.push(
      `background-image:url('${escapeHtml(props.backgroundImage)}')`,
      "background-size:cover",
      "background-position:center"
    );
  }
  return declarations.join(";");
};

const renderBlock = (block: BlastBlock): string => {
  const inner = (() => {
    switch (block.type) {
      case "HEADLINE": {
        const logo = block.props.logo
          ? `<img src="${escapeHtml(block.props.logo)}" alt="" width="180" style="display:block;margin:0 auto 16px;max-width:100%" />`
          : "";
        const subheading = block.props.subheading
          ? `<p style="${styleToCss(block.props.subheadingStyle, 16)}">${sanitizeRichText(block.props.subheading)}</p>`
          : "";
        return `${logo}<h1 style="${styleToCss(block.props.headingStyle, 32)}">${sanitizeRichText(block.props.heading)}</h1>${subheading}`;
      }
      case "TEXT": {
        const heading = block.props.heading
          ? `<h2 style="${styleToCss(block.props.headingStyle, 20)}">${sanitizeRichText(block.props.heading)}</h2>`
          : "";
        return `${heading}<div style="${styleToCss(block.props.bodyStyle, 16)}">${sanitizeRichText(block.props.body)}</div>`;
      }
      case "IMAGE": {
        if (!block.props.src) return "";
        const caption = block.props.caption
          ? `<p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#807f7f;text-align:center;margin:8px 0 0">${escapeHtml(block.props.caption)}</p>`
          : "";
        return `<img src="${escapeHtml(block.props.src)}" alt="${escapeHtml(block.props.alt ?? "")}" style="display:block;width:100%;max-width:552px;margin:0 auto;border-radius:12px" />${caption}`;
      }
      case "SEPARATOR":
        return `<hr style="border:none;border-top:1px solid ${block.props.color ?? "#e4e4e7"};margin:0" />`;
      case "FOOTER":
        return (
          subscribeInner(block.props) +
          footerInner(
            block.props.text ?? "",
            block.props.unsubscribeLabel,
            styleToCss(block.props.textStyle, 12)
          )
        );
      case "SUBSCRIBE": {
        const description = block.props.description
          ? `<p style="${styleToCss(block.props.descriptionStyle, 16)};margin-bottom:12px">${sanitizeRichText(block.props.description)}</p>`
          : "";
        return `${description}<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td style="background-color:${block.props.buttonColor ?? "#0d3185"};border-radius:8px"><a href="{{subscribeUrl}}" style="display:inline-block;padding:10px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:${block.props.textColor ?? "#ffffff"};text-decoration:none">${escapeHtml(block.props.label)}</a></td></tr></table>`;
      }
      case "BUTTON": {
        const href = block.props.href ?? "#";
        return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td style="background-color:${block.props.buttonColor ?? "#0d3185"};border-radius:8px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:10px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none">${escapeHtml(block.props.label)}</a></td></tr></table>`;
      }
    }
  })();

  return `<tr><td style="${surfaceCss(block.props)}">${inner}</td></tr>`;
};

const DEFAULT_UNSUBSCRIBE_LABEL = "Unsubscribe from these emails";
const DEFAULT_SUBSCRIBE_LABEL = "Subscribe to these emails";

// Rendered above the org line so the opt-out stays last, where readers expect
// it. The href is a merge token resolved from the sending organization.
const subscribeInner = (props: {
  showSubscribe?: boolean;
  subscribeLabel?: string;
  subscribeAsButton?: boolean;
  buttonColor?: string;
}) => {
  if (!props.showSubscribe) return "";

  const label = escapeHtml(props.subscribeLabel || DEFAULT_SUBSCRIBE_LABEL);

  if (!props.subscribeAsButton) {
    return `<p style="margin:0 0 8px"><a href="{{subscribeUrl}}" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#2c86d9;font-weight:bold;text-decoration:none">${label}</a></p>`;
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 12px"><tr><td style="background-color:#0d3185;border-radius:8px"><a href="{{subscribeUrl}}" style="display:inline-block;padding:8px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#ffffff;text-decoration:none">${label}</a></td></tr></table>`;
};

// The href is a merge token: it resolves to the recipient's own unsubscribe
// link when the send renders the body.
const footerInner = (text: string, label: string | undefined, css: string) =>
  [
    text ? `<p style="${css}">${escapeHtml(text)}</p>` : "",
    `<a href="{{unsubscribeUrl}}" style="color:#2c86d9;font-weight:bold;font-size:10px;text-decoration:none">${escapeHtml(label || DEFAULT_UNSUBSCRIBE_LABEL)}</a>`,
  ].join("");

// Only the classic editor uses this: it has no block model, so there is no
// footer block the author could have added themselves.
const fallbackFooterRow = (organizationName: string) =>
  `<tr><td style="border-top:1px solid #e4e4e7;padding:20px;text-align:center">${footerInner(
    organizationName,
    undefined,
    "font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#202020;margin:0"
  )}</td></tr>`;

// A classic body is authored HTML with no shell, so the same footer is wrapped
// around it at send time rather than stored - otherwise re-opening the editor
// would show the wrapper as content.
export const wrapClassicHtml = (
  bodyHtml: string,
  organizationName: string
): string =>
  documentShell(
    `<tr><td style="padding:24px">${sanitizeRichText(bodyHtml)}</td></tr>` +
      fallbackFooterRow(organizationName)
  );

// Blocks become a 600px table document, which is the only layout email clients
// agree on. Nothing is appended: no footer block means no footer.
export const renderBlastHtml = (blocks: BlastBlock[]): string =>
  documentShell(blocks.map(renderBlock).join(""));

const documentShell = (rows: string): string =>
  [
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f5;padding:24px 0">',
    "<tr><td>",
    '<table role="presentation" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;max-width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden">',
    rows,
    "</table>",
    "</td></tr>",
    "</table>",
  ].join("");
