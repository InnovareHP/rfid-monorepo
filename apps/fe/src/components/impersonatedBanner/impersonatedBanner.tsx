"use client";

import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@dashboard/ui/components/alert-dialog";
import { Button } from "@dashboard/ui/components/button";
import { useRouteContext } from "@tanstack/react-router";
import { LogOut, ShieldAlert } from "lucide-react";

const ImpersonationBanner = () => {
  const {
    user: { name },
    session: { impersonatedBy },
  } = useRouteContext({ from: "__root__" }) as {
    user: { name: string | null };
    session: { impersonatedBy: string | null };
  };

  const handleExit = async () => {
    try {
      queryClient.clear();

      await authClient.admin.stopImpersonating();

      window.location.href = import.meta.env.VITE_SUPPORT_URL + "/admin";
    } catch (error) {
      console.error("Failed to exit impersonation", error);
    }
  };

  return impersonatedBy ? (
    <div className="fixed top-0 left-0 z-[9999] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        {/* Left */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShieldAlert className="h-4 w-4 text-yellow-500" />

          <span>
            You are impersonating{" "}
            <strong className="text-foreground">{name}</strong>
          </span>
        </div>

        {/* Right */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground font-semibold"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Exit Impersonation Mode?</AlertDialogTitle>

              <AlertDialogDescription>
                You will stop impersonating <strong>{name}</strong> and return
                to the admin account.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>

              <AlertDialogAction asChild>
                <Button
                  variant="destructive"
                  onClick={handleExit}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Exit
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  ) : null;
};

export default ImpersonationBanner;
