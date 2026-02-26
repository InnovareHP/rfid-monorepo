import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc as AdminAccess,
  defaultStatements as AdminStatements,
} from "better-auth/plugins/admin/access";
import {
  defaultStatements as OrgStatements,
  adminAc as orgAccess,
} from "better-auth/plugins/organization/access";

const statement = {
  ...AdminStatements,
  ...OrgStatements,
  billing: ["manage_billing"],
  license: ["manage_licenses"],
  app: [
    "view",
    "connect_integration",
    "disconnect_integration",
    "configure",
    "manage_app_permissions",
  ],
  project: ["create", "share", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const super_admin = ac.newRole({
  ...AdminAccess.statements, // full admin powers
});

export const admin = ac.newRole({
  ...AdminAccess.statements, // limited admin powers, can customize if needed
});

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
  ...orgAccess.statements,
});

export const liason = ac.newRole({
  project: ["create", "update"], // limited operational
});

export const admission_manager = ac.newRole({
  project: ["create", "update"], // limited operational
});

export const support = ac.newRole({
  project: ["create", "update"], // limited operational
});
