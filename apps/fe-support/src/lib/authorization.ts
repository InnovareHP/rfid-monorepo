import { redirect } from "@tanstack/react-router";
import { ROLES } from "./contant";

export const IsAuthenticated = (context: any) => {
  const session = context.context.session;

  const user = context.context.user;

  if (!session || user.role !== ROLES.USER) {
    throw redirect({ to: "/$lang" as any });
  }

  return true;
};

export const IsSupport = (context: any) => {
  const session = context.context.session;

  const user = context.context.user;

  if (!session || user.role !== ROLES.SUPPORT) {
    throw redirect({ to: "/support" as any });
  }

  return true;
};
