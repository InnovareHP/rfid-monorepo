// Astro templates put classes in HTML attributes, which eslint's AST rules
// cannot see, so this covers the same ground as the no-restricted-syntax rule
// in apps/fe and apps/fe-support.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PALETTE =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone";
const PREFIX =
  "bg|text|border|ring|divide|from|via|to|outline|decoration|shadow|accent|caret|fill|stroke";

const CHECKS = [
  {
    re: new RegExp(`\\b(${PREFIX})-(${PALETTE})-\\d{2,3}\\b`, "g"),
    msg: "raw Tailwind palette color, use a theme token",
  },
  {
    re: /\b(bg|text|border|ring|divide|fill|stroke)-white\b/g,
    msg: "literal white, use bg-card or text-primary-foreground",
  },
  { re: /-\[#[0-9a-fA-F]{3,8}\]/g, msg: "hex literal, add a token instead" },
];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const findings = [];
for (const file of walk("src").filter((f) => /\.(astro|tsx?|css)$/.test(f))) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const { re, msg } of CHECKS) {
      for (const m of line.matchAll(re)) {
        findings.push(`${file}:${i + 1}  ${m[0]}  — ${msg}`);
      }
    }
  });
}

findings.forEach((f) => console.log(f));
console.log(`\n${findings.length} styling warnings`);

// Flip to a non-zero exit once the count reaches zero.
process.exit(0);
