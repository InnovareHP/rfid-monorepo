import { useCanWrite, WriteAccessContext } from "@/hooks/use-can-write";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@dashboard/ui/components/tooltip";
import type { ReactNode } from "react";

const READ_ONLY_REASON =
  "Your subscription has ended. Renew to make changes again.";

export function WriteAccessProvider({
  canWrite,
  children,
}: {
  canWrite: boolean;
  children: ReactNode;
}) {
  return (
    <WriteAccessContext.Provider value={canWrite}>
      {children}
    </WriteAccessContext.Provider>
  );
}

// Wraps a primary write control. A read-only organization keeps seeing it, so
// the page still explains what it does, but cannot fire it.
export function WriteGate({ children }: { children: ReactNode }) {
  const canWrite = useCanWrite();

  if (canWrite) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-not-allowed opacity-50 [&_*]:pointer-events-none">
          {children}
        </span>
      </TooltipTrigger>

      <TooltipContent>{READ_ONLY_REASON}</TooltipContent>
    </Tooltip>
  );
}
