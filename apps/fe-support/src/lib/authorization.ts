import { redirect } from "@tanstack/react-router";

export const IsAuthenticated = (context: any) => {
  const session = context.context.session;

  if (!session) {
    throw redirect({ to: "/$lang" as any });
  }

  return true;
};
