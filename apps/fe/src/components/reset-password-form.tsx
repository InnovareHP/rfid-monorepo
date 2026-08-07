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

// There is no password to reset. Lost access is recovered by an organization
// owner issuing a passkey reset code, never by email.
export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("p-4", className)} {...props}>
      <Card className="mx-auto max-w-md">
        <CardHeader className="text-center">
          <Fingerprint className="mx-auto h-10 w-10 text-primary" />
          <CardTitle className="mt-2">Passwords are no longer used</CardTitle>
          <CardDescription>
            This account signs in with a passkey held on your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you have lost every device with a passkey, ask an owner in your
            organization to reset your passkeys. They will give you a one-time
            recovery code to register a new device.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
