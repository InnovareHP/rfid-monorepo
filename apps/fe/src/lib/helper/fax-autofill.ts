type FaxColumn = { id: string; name: string; type: string };

const FAX_FIELD_NAMES = ["fax", "fax number"];
const TEXT_LIKE_TYPES = ["TEXT", "PHONE"];

export function resolveFaxAutofill(
  columns: FaxColumn[] | undefined,
  record: Record<string, unknown> | undefined
): { faxFieldId: string | null; existingFax: string } {
  const faxColumn = columns?.find((c) =>
    FAX_FIELD_NAMES.includes(c.name.trim().toLowerCase())
  );
  if (!faxColumn || !TEXT_LIKE_TYPES.includes(faxColumn.type)) {
    return { faxFieldId: null, existingFax: "" };
  }
  const value = record?.[faxColumn.name];
  const existingFax = typeof value === "string" ? value.trim() : "";
  return { faxFieldId: faxColumn.id, existingFax };
}
