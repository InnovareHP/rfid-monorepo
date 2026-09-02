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
