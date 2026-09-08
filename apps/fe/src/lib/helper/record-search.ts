// The follow-up queue and the global links into a board carry the record name
// as ?q=, which every list page adopts as its search term.
export type RecordSearch = { q?: string };

export const validateRecordSearch = (
  search: Record<string, unknown>
): RecordSearch => ({
  q: typeof search.q === "string" && search.q ? search.q : undefined,
});
