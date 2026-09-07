import { redirect } from "@tanstack/react-router";
import { ROLES } from "./contant";

// The root beforeLoad seeds this from the session query, so both fields are
// absent for a signed-out visitor.
type GuardArgs = {
  context: {
    session?: unknown;
    user?: { role?: string | null } | null;
  };
};

const DEFAULT_LANG = "en";

// Redirects carried an unresolved "$lang" and no params, so the target URL held
// a literal segment instead of the language.
const toPortal = () =>
  redirect({ to: "/$lang", params: { lang: DEFAULT_LANG } });

export const IsAuthenticated = ({ context }: GuardArgs) => {
  if (!context.session || context.user?.role !== ROLES.USER) throw toPortal();
  return true;
};

export const IsSuperAdmin = ({ context }: GuardArgs) => {
  // Non-super-admins should not see /admin; send them to the support portal.
  if (!context.session || context.user?.role !== ROLES.SUPER_ADMIN)
    throw toPortal();
  return true;
};

export const IsSupport = ({ context }: GuardArgs) => {
  if (!context.session || context.user?.role !== ROLES.SUPPORT)
    throw redirect({ to: "/support" });
  return true;
};

export const IsSupportOrAdmin = ({ context }: GuardArgs) => {
  const role = context.user?.role;
  if (!context.session || (role !== ROLES.SUPPORT && role !== ROLES.SUPER_ADMIN))
    throw toPortal();
  return true;
};
