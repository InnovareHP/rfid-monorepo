// Layout traps eslint's AST rules cannot see, in the same shape as
// apps/landing/scripts/check-styles.mjs. Each of these shipped at least once
// and looked like a styling mistake rather than a broken rule.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

// A height source: h-*, size-*, or a flex-1 that takes it from the parent.
const HAS_HEIGHT = /(?:^|[\s:])(h-|size-)/;
const TAKES_FLEX = /\bflex-1\b/;

const findings = [];

const report = (file, index, found, msg) =>
  findings.push(`${file}:${index + 1}  ${found}  - ${msg}`);

for (const file of walk("src").filter((f) => /\.tsx?$/.test(f))) {
  const source = readFileSync(file, "utf8");
  const lines = source.split("\n");

  // Radix ScrollArea's viewport is h-full against the root, so a percentage
  // needs a definite height to resolve against. A max-h on the root leaves
  // the height auto, the percentage collapses, and the list overflows the
  // panel with no scrollbar at all.
  for (const match of source.matchAll(/<ScrollArea\b[^>]*>/g)) {
    const tag = match[0];
    const line = source.slice(0, match.index).split("\n").length - 1;
    const className = tag.match(/className="([^"]*)"/)?.[1];

    // A className-less ScrollArea may still be sized by a wrapper, so only an
    // explicit className is checked. Tested against the extracted value, not
    // the raw tag, where the opening quote is not a class boundary.
    if (className === undefined) continue;

    if (/(?:^|[\s:])max-h-/.test(className)) {
      report(file, line, "ScrollArea max-h", "give the root a definite height (h-full inside a flex column), not a max-h");
    } else if (!HAS_HEIGHT.test(className) && !TAKES_FLEX.test(className)) {
      report(file, line, "ScrollArea without height", "add h-full or min-h-0 flex-1, or the viewport cannot scroll");
    }
  }

  lines.forEach((line, index) => {
    // vh ignores the mobile browser chrome, so anything sized against it sits
    // under the toolbar. dvh tracks it.
    for (const match of line.matchAll(/-\[[^\]]*?\b\d+vh\b[^\]]*\]/g)) {
      report(file, index, match[0], "vh ignores mobile browser chrome, use dvh");
    }

    // Same reason, plus these usually want min-h-full inside the app shell,
    // which already owns the viewport height and its own scroll container.
    for (const match of line.matchAll(/\b(?:min-)?h-screen\b/g)) {
      report(file, index, match[0], "use h-dvh / min-h-dvh standalone, or min-h-full inside the app shell");
    }

    // A percentage cap on a shell modal's body clips it on a phone in
    // landscape, where the whole modal is about 400px tall.
    for (const match of line.matchAll(/max-h-\[\d+(?:dvh|svh|lvh|%)\][^"]*\boverflow-y-auto\b/g)) {
      report(file, index, match[0], "size a modal body with min-h-0 flex-1, not a percentage cap");
    }
  });
}

findings.forEach((finding) => console.log(finding));

if (findings.length) {
  console.log(`\n${findings.length} layout error(s)`);
  process.exit(1);
}

console.log("layout checks clean");
