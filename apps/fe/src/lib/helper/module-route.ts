// The four seeded modules keep the paths they shipped with so no saved link or
// bookmark breaks. Everything else lives under the generic records route.
const SYSTEM_MODULE_PATHS: Record<string, string> = {
  LEAD: "master-list",
  REFERRAL: "referral-list",
  CONTACT: "contacts",
  COMPANY: "companies",
};

export const modulePath = (moduleKey: string) =>
  SYSTEM_MODULE_PATHS[moduleKey] ?? `records/${moduleParam(moduleKey)}`;

// Urls stay lowercase; module keys are uppercase. Reading a param through
// moduleKeyFromParam keeps older mixed-case links working.
export const moduleParam = (moduleKey: string) => moduleKey.toLowerCase();

export const moduleKeyFromParam = (param: string) => param.toUpperCase();

// Seeded modules read better than their keys; a custom module is already named
// by its key.
const SYSTEM_MODULE_LABELS: Record<string, string> = {
  LEAD: "Facility",
  REFERRAL: "Referral",
  CONTACT: "Contact",
  COMPANY: "Company",
};

export const moduleLabel = (moduleKey: string) =>
  SYSTEM_MODULE_LABELS[moduleKey] ?? moduleKey;

// The lead options page shipped one level deeper than its list, so option paths
// are mapped rather than derived from modulePath.
const SYSTEM_OPTION_PATHS: Record<string, string> = {
  LEAD: "master-list/leads",
  REFERRAL: "referral-list",
  CONTACT: "contacts",
  COMPANY: "companies",
};

// Built as an href rather than through Link params: a picker opens this in a new
// tab so the record being filled in is not lost, and an anchor takes a string.
export const moduleOptionHref = (
  moduleKey: string,
  team: string,
  fieldId: string
) => {
  const base =
    SYSTEM_OPTION_PATHS[moduleKey] ?? `records/${moduleParam(moduleKey)}`;

  return `/${team}/${base}/option/${fieldId}`;
};
