import type {
  DuplicateMatch,
  NameMatch,
} from "@/services/board/board-module-service";

export type DuplicateFindings = {
  duplicates: DuplicateMatch[];
  exactMatch: NameMatch | null;
  nearMatches: NameMatch[];
};

export const hasFindings = (findings: DuplicateFindings) =>
  findings.duplicates.length > 0 ||
  findings.nearMatches.length > 0 ||
  findings.exactMatch !== null;
