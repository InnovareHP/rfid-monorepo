import { cn } from "@dashboard/ui/lib/utils";
import type { ReactNode } from "react";

// Frame for pages rendered inside a host site's iframe: no gradient, no
// wordmark, no full-viewport height, so the embed inherits the host's page.
export const EmbedShell = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn("flex w-full flex-col items-center bg-transparent", className)}>
    {children}
  </div>
);
