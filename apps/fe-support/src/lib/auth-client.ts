import { adminClient } from "better-auth/client/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
} from "better-auth/plugins/admin/access";
import { createAuthClient } from "better-auth/react";
import { ROLES } from "./contant";

// Mirrors the admin-plugin roles in the API so setRole is typed with the roles
// this platform actually has instead of Better Auth's admin/user default.
const ac = createAccessControl(defaultStatements);

export const adminRoles = {
  [ROLES.SUPER_ADMIN]: ac.newRole({ ...adminAc.statements }),
  [ROLES.SUPPORT]: ac.newRole({}),
  [ROLES.USER]: ac.newRole({}),
};

export type AdminRole = keyof typeof adminRoles;

export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles: adminRoles })],
});

export const { signIn, signUp, signOut, useSession, refreshToken, getSession } =
  authClient;
