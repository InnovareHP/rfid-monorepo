import {
  DOMAIN_ROLE_PERMISSIONS,
  DOMAIN_STATEMENT,
  ROLES,
  type DomainPermission,
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

export const member = ac.newRole({
  ...DOMAIN_ROLE_PERMISSIONS[ROLES.MEMBER],
});

export const liaison = ac.newRole({
  ...DOMAIN_ROLE_PERMISSIONS[ROLES.LIAISON],
});

// Keyed by the stored member.role value, which misspells liaison.
const orgRoles: Record<string, { authorize: (p: DomainPermission) => { success: boolean } }> = {
  [ROLES.OWNER]: owner,
  [ROLES.ADMIN]: admin,
  [ROLES.MEMBER]: member,
  [ROLES.LIAISON]: liaison,
};

// Same grant table and same Better Auth engine the API guard uses, so the two
// cannot drift. An unknown role fails closed.
export const can = (
  role: string | null | undefined,
  permission: DomainPermission
) => (role ? orgRoles[role]?.authorize(permission).success === true : false);
