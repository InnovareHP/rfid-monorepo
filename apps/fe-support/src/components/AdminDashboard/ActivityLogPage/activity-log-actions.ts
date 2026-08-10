import type { Badge } from "@dashboard/ui/components/badge";

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"];

type ActionMeta = {
  label: string;
  variant: BadgeVariant;
};

// Keyed by the AdminAction enum in prisma/models/auth.prisma. An action missing
// here still renders, it just shows its raw enum name.
export const ACTION_META: Record<string, ActionMeta> = {
  BAN_USER: { label: "Ban user", variant: "destructive" },
  UNBAN_USER: { label: "Unban user", variant: "success" },
  SET_ROLE: { label: "Set role", variant: "info" },
  REMOVE_USER: { label: "Remove user", variant: "destructive" },
  IMPERSONATE_USER: { label: "Impersonate", variant: "warning" },
  STOP_IMPERSONATE: { label: "Stop impersonate", variant: "secondary" },
  SET_PASSWORD: { label: "Set password", variant: "warning" },
  REVOKE_SESSIONS: { label: "Revoke sessions", variant: "warning" },
  UPDATE_USER: { label: "Update user", variant: "info" },
};

export const ACTION_OPTIONS = [
  { label: "All actions", value: "ALL" },
  ...Object.entries(ACTION_META).map(([value, meta]) => ({
    label: meta.label,
    value,
  })),
];
