import { BillingTopBar } from "@/components/billing/billing-top-bar";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { cn } from "@dashboard/ui/lib/utils";
import { Clock, RefreshCw } from "lucide-react";

// Only the owner can buy a plan, so everyone else lands here instead of a plan
// picker whose every button would 403.
export function BillingAwaitingOwner({
  className,
  standalone,
  onLogout,
  ...props
}: {
  standalone?: boolean;
  onLogout?: () => void;
} & React.ComponentProps<"div">) {
  return (
    <div className={cn("w-full min-h-screen", className)} {...props}>
      {standalone && <BillingTopBar onLogout={onLogout} />}

      <div className="mx-auto flex w-full max-w-lg flex-col justify-center p-6 py-20">
        <Card>
          <CardHeader className="text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Clock className="text-primary h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Waiting on your owner</CardTitle>
            <CardDescription className="mt-2">
              Your account is ready, but the organization does not have an
              active plan yet. Only the owner can finalize billing — once they
              do, your access opens automatically.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
              Check again
            </Button>

            {onLogout && (
              <Button variant="ghost" className="w-full" onClick={onLogout}>
                Log out
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
