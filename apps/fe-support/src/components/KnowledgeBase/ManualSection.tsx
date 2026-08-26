import type { ReactNode } from "react";

export function ManualSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="page-title mb-4 text-lg font-bold tracking-tight sm:mb-5 sm:text-xl">
        {title}
      </h2>

      {children}
    </section>
  );
}
