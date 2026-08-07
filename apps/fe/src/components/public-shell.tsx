import { cn } from "@dashboard/ui/lib/utils";
import type { ReactNode } from "react";

const BRAND_WORDMARK = "/branding/Full/Refidly [Full] - White-no-bg.png";

const SHELL_GRADIENT =
  "bg-[linear-gradient(58deg,#01184d_0%,#0d3185_25.66%,#2c86d9_53.06%,#64d1f4_74.2%,#f5f5f5_100%)]";

// Branded frame every anonymous page renders inside: form, booking, confirmation.
export const PublicShell = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex min-h-screen flex-col items-center gap-6 p-4 sm:justify-center sm:gap-10 sm:p-6",
      SHELL_GRADIENT,
      className
    )}
  >
    {children}

    <img
      src={BRAND_WORDMARK}
      alt="Refidly"
      className="h-12 w-auto object-contain sm:h-[70px]"
    />
  </div>
);
