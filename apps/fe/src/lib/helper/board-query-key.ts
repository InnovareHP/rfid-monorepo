// One key shape for every module's record list, so a module an organization
// created needs no entry anywhere. Replaces the four module-to-name maps that
// each had to be extended by hand.
export const boardQueryKey = (moduleKey: string) => ["records", moduleKey];
