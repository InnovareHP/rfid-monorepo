import { Button } from "@dashboard/ui/components/button";
import { useRouter } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { ErrorPage } from "./error-page";

export const ServerErrorPage = ({ reset }: { reset?: () => void }) => {
  const router = useRouter();

  const retry = () => {
    reset?.();
    router.invalidate();
  };

  return (
    <ErrorPage
      code="500"
      title="Server error"
      description="Our server hit an unexpected snag processing that. It's not something you did — our team has been notified automatically."
      artSrc="/branding/Error/server-error-mascot.png"
      artAlt="Refidly mascot crying beside an unplugged cable"
      supportPrefix="Still broken?"
      supportSuffix="— this helps us fix it faster."
      action={
        <Button
          size="sm"
          onClick={retry}
          className="h-8 gap-2.5 bg-brand px-3 text-sm font-bold text-brand-foreground shadow-xs hover:bg-brand/90"
        >
          <RefreshCw className="size-[11px]" />
          Try Again
        </Button>
      }
    />
  );
};
