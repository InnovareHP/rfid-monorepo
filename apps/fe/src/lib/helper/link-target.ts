// A link field points at another module's records. When the target does not
// exist yet the picker has to say where to go and add it, so the module's own
// pages live here rather than being spelled out at each picker.
export type LinkTargetModule = "LEAD" | "CONTACT" | "COMPANY";

type LinkTarget = {
  // What the user calls the list, not the module key.
  label: string;
  listPath: string;
  createPath: string;
};

const TARGETS: Record<LinkTargetModule, LinkTarget> = {
  LEAD: {
    label: "Master Marketing List",
    listPath: "/$team/master-list",
    createPath: "/$team/master-list/create",
  },
  CONTACT: {
    label: "Phonebook",
    listPath: "/$team/contacts",
    createPath: "/$team/contacts/create",
  },
  COMPANY: {
    label: "Companies",
    listPath: "/$team/companies",
    createPath: "/$team/companies/create",
  },
};

export const linkTarget = (module: string): LinkTarget | null =>
  TARGETS[module as LinkTargetModule] ?? null;

// Built by hand rather than through Link params: these open in a new tab so a
// half-filled record is never lost, and an anchor takes a plain href.
export const linkTargetCreateHref = (module: string, team: string) => {
  const target = linkTarget(module);
  return target ? target.createPath.replace("$team", team) : null;
};
