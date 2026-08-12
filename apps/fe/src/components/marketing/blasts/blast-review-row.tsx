import type { ReactNode } from "react";

type BlastReviewRowProps = { label: string; value: ReactNode };

export const BlastReviewRow = ({ label, value }: BlastReviewRowProps) => (
  <div className="flex items-center justify-between gap-6 py-3 text-base">
    <span className="font-medium text-foreground">{label}</span>
    <span className="truncate text-right font-semibold text-foreground">
      {value}
    </span>
  </div>
);
