import { stopImpersonating } from "@/services/admin/admin-service";
import { Button } from "@dashboard/ui/components/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function ImpersonationBanner({ userName }: { userName: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const stopMutation = useMutation({
    mutationFn: stopImpersonating,
    onSuccess: () => {
      toast.success("Stopped impersonating");
      queryClient.invalidateQueries({ queryKey: ["session"] });
      navigate({ to: "/admin/users" });
    },
    onError: () => toast.error("Failed to stop impersonating"),
  });

  return (
    <div className="bg-warning text-warning-foreground sticky top-0 z-50 flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium">
      <AlertTriangle className="h-4 w-4" />
      <span>You are impersonating {userName}</span>
      {/* Tinted from the banner's own foreground so it stays legible on
          bg-warning in both themes. */}
      <Button
        variant="outline"
        size="sm"
        className="border-warning-foreground/40 bg-warning-foreground/10 text-warning-foreground hover:bg-warning-foreground/20 hover:text-warning-foreground h-7"
        onClick={() => stopMutation.mutate()}
        disabled={stopMutation.isPending}
      >
        {stopMutation.isPending ? "Stopping..." : "Stop Impersonating"}
      </Button>
    </div>
  );
}
