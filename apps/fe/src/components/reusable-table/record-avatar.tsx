import { cn } from "@dashboard/ui/lib/utils";

const AVATAR_COLORS = [
  "bg-avatar-1",
  "bg-avatar-2",
  "bg-avatar-3",
  "bg-avatar-4",
  "bg-avatar-5",
  "bg-avatar-6",
  "bg-avatar-7",
  "bg-avatar-8",
];

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export function RecordAvatar({
  name,
  className,
  onClick,
  title,
}: {
  name?: string;
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  const label = (name ?? "").trim();
  const classes = cn(
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-avatar-foreground select-none shadow-sm",
    label ? getColor(label) : "bg-muted-foreground",
    onClick &&
      "cursor-pointer transition-transform hover:ring-2 hover:ring-primary/40 hover:-translate-y-0.5",
    className
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} title={title}>
        {label ? getInitials(label) : "?"}
      </button>
    );
  }

  return (
    <div aria-hidden="true" className={classes}>
      {label ? getInitials(label) : "?"}
    </div>
  );
}
