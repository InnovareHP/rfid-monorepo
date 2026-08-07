import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { cn } from "@dashboard/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { Fingerprint } from "lucide-react";

// Password reset links no longer resolve to anything; kept so old emails land
// somewhere that explains what to do instead.
export function ResetPasswordVerifyForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("p-4", className)} {...props}>
      <Card className="mx-auto max-w-md">
        <CardHeader className="text-center">
          <Fingerprint className="mx-auto h-10 w-10 text-primary" />
          <CardTitle className="mt-2">This link no longer works</CardTitle>
          <CardDescription>
            Sign-in is by passkey, so there is no password to set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Open the sign-in page and use your passkey. If this device has none
            yet, choose Set it up here and follow the enrollment steps.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
