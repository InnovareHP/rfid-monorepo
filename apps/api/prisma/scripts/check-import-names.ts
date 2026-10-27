import { readFileSync } from "fs";
import { createSimilarNameFinder } from "../../src/lib/board/name-similarity";
import { normalizeRecordNameLoose } from "../../src/lib/crypto/record-name-index";

// Replays the Master List importer's near-match rule over a JSON array of
// names, in order, and prints the names it would drop.
//
//   pnpm --filter api check:import-names -- <names.json>

const names: string[] = JSON.parse(readFileSync(process.argv[2], "utf-8"));
const finder = createSimilarNameFinder();
const conflicts: { name: string; matched: string }[] = [];

for (const name of names) {
  const loose = normalizeRecordNameLoose(name);
  const matched = finder.find(loose);
  if (matched) {
    conflicts.push({ name, matched });
    continue;
  }
  finder.add(name, loose);
}

console.log(JSON.stringify(conflicts));
