import { Button } from "@dashboard/ui/components/button";
import { Card } from "@dashboard/ui/components/card";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { Plus, Trash2, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { ConfirmationDialog } from "../confirmation-dialog";

type LogPageHeaderProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
};

export const LogPageHeader = ({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: LogPageHeaderProps) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shrink-0">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
      </div>
    </div>
    <Button onClick={onAction} className="bg-primary hover:bg-primary/90">
      <Plus className="h-4 w-4 mr-2" />
      {actionLabel}
    </Button>
  </div>
);

type LogStatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
};

export const LogStatCard = ({
  icon: Icon,
  label,
  value,
  hint,
}: LogStatCardProps) => (
  <Card className="p-4 flex flex-row items-center gap-4 border-gray-200">
    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-xl font-bold text-gray-900 tabular-nums truncate">
        {value}
      </p>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  </Card>
);

type LogEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
};

export const LogEmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: LogEmptyStateProps) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
      <Icon className="h-8 w-8 text-primary" />
    </div>
    <div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>
    </div>
    <Button
      onClick={onAction}
      variant="outline"
      className="mt-2 border-primary/40 hover:bg-primary/10"
    >
      <Plus className="h-4 w-4 mr-2" />
      {actionLabel}
    </Button>
  </div>
);

export const LogTableSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div className="space-y-3 p-2" aria-busy="true" aria-label="Loading entries">
    <Skeleton className="h-9 w-full" />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
);

type LogRowDeleteProps = {
  entityLabel: string;
  onDelete: () => void;
  disabled?: boolean;
};

export const LogRowDelete = ({
  entityLabel,
  onDelete,
  disabled,
}: LogRowDeleteProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => setConfirmOpen(true)}
        aria-label={`Delete ${entityLabel}`}
        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${entityLabel}?`}
        description="This entry will be removed from the log. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={onDelete}
      />
    </>
  );
};
