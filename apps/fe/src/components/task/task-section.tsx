import type { ReactNode } from "react";

type TaskSectionProps = {
  title: string;
  // Right-aligned control on the heading row: a count, an upload button.
  action?: ReactNode;
  children: ReactNode;
};

// Every section of the task detail is a heading, a rule, then its rows.
export const TaskSection = ({ title, action, children }: TaskSectionProps) => (
  <section className="space-y-4">
    <div className="flex items-center justify-between gap-4 border-b pb-3">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);
