import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

export const statement = {
  ...defaultStatements,
  organization: ["create", "share", "update", "delete"],
  project: ["create", "share", "update", "delete"],
  stripe: ["create", "update", "delete", "view"],
  billing: ["manage_billing"],
  license: ["manage_licenses"],
  app: [
    "view",
    "connect_integration",
    "disconnect_integration",
    "configure",
    "manage_app_permissions",
  ],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  billing: ["manage_billing"],
  license: ["manage_licenses"],
  app: [
    "view",
    "connect_integration",
    "disconnect_integration",
    "configure",
    "manage_app_permissions",
  ],
  ...adminAc.statements,
});

export const liason = ac.newRole({
  project: ["create", "update"],
});

export const admin = ac.newRole({
  project: ["create", "update"],
});
