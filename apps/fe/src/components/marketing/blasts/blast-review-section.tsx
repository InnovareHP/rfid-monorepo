import type { ReactNode } from "react";

type BlastReviewSectionProps = { title: string; children: ReactNode };

export const BlastReviewSection = ({
  title,
  children,
}: BlastReviewSectionProps) => (
  <section className="space-y-3">
    <h2 className="text-base font-semibold text-foreground">{title}</h2>
    <div className="border-b border-border" />
    {children}
  </section>
);
