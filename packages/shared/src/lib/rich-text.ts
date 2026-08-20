// Inline markup the blast editors are allowed to emit. Shared because the API
// sanitizes before storing and the builder preview renders the same HTML.
const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "br",
  "p",
  "div",
  "span",
  "a",
  "ul",
  "ol",
  "li",
]);

const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "font-size",
  "font-family",
  "font-weight",
  "font-style",
  "text-align",
  "text-decoration",
]);

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const sanitizeStyle = (value: string) =>
  value
    .split(";")
    .map((declaration) => declaration.trim())
    .filter((declaration) => {
      const [property, ...rest] = declaration.split(":");
      if (!property || rest.length === 0) return false;
      if (!ALLOWED_STYLE_PROPS.has(property.trim().toLowerCase())) return false;
      return !/url\s*\(|expression|javascript:/i.test(rest.join(":"));
    })
    .join("; ");

const sanitizeAttributes = (tag: string, raw: string) => {
  const attributes: string[] = [];

  for (const match of raw.matchAll(
    /([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
  )) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? "";

    if (name === "style") {
      const style = sanitizeStyle(value);
      if (style) attributes.push(`style="${escapeHtml(style)}"`);
      continue;
    }

    if (name === "href" && tag === "a" && /^(https?:|mailto:)/i.test(value)) {
      attributes.push(`href="${escapeHtml(value)}"`);
    }
  }

  return attributes.length ? ` ${attributes.join(" ")}` : "";
};

// Whitelist sanitizer. Local rather than a dependency because the allowed
// surface is this small and it has to run in both Node and the browser.
export const sanitizeRichText = (html: string): string =>
  html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<(\/?)([a-z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/gi,
      (_full, slash: string, tagName: string, rest: string) => {
        const tag = tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) return "";
        if (slash) return `</${tag}>`;
        return `<${tag}${sanitizeAttributes(tag, rest)}>`;
      }
    )
    .replace(/<(?![a-z/])/gi, "&lt;");

// Merge tokens the editor offers under Substitute Variables.
export const BLAST_MERGE_VARIABLES = [
  { token: "{{recordName}}", label: "Recipient Name" },
  { token: "{{email}}", label: "Recipient Email" },
  { token: "{{organizationName}}", label: "Organization Name" },
] as const;

export const applyMergeVariables = (
  html: string,
  values: {
    recordName: string;
    email: string;
    organizationName: string;
    // Resolved per recipient from their own subscription token, so it is only
    // known at send time and never while editing.
    unsubscribeUrl?: string;
    // Org-wide, for a forwarded copy whose reader is not on the list yet.
    subscribeUrl?: string;
  }
): string =>
  html
    .replace(/\{\{\s*recordName\s*\}\}/g, escapeHtml(values.recordName))
    .replace(/\{\{\s*email\s*\}\}/g, escapeHtml(values.email))
    .replace(
      /\{\{\s*organizationName\s*\}\}/g,
      escapeHtml(values.organizationName)
    )
    .replace(
      /\{\{\s*unsubscribeUrl\s*\}\}/g,
      escapeHtml(values.unsubscribeUrl ?? "")
    )
    .replace(
      /\{\{\s*subscribeUrl\s*\}\}/g,
      escapeHtml(values.subscribeUrl ?? "")
    );
