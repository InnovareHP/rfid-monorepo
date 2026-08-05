import {
  DOMAIN_ROLE_PERMISSIONS,
  DOMAIN_STATEMENT,
  ROLES,
} from "@dashboard/shared";
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
  ...DOMAIN_STATEMENT,
} as const;

export const ac = createAccessControl(statement);

export const super_admin = ac.newRole({
  ...AdminAccess.statements,
});

export const owner = ac.newRole({
  ...orgAccess.statements,
  ...DOMAIN_ROLE_PERMISSIONS[ROLES.OWNER],
});

export const admin = ac.newRole({
  ...orgAccess.statements,
  organization: ["update"],
  ...DOMAIN_ROLE_PERMISSIONS[ROLES.ADMIN],
});

export const admission_manager = ac.newRole({
  ...DOMAIN_ROLE_PERMISSIONS[ROLES.ADMISSION_MANAGER],
});

export const liaison = ac.newRole({
  ...DOMAIN_ROLE_PERMISSIONS[ROLES.LIAISON],
});
