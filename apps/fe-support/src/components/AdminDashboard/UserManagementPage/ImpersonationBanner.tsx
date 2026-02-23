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
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <AlertTriangle className="h-4 w-4" />
      <span>You are impersonating {userName}</span>
      <Button
        variant="outline"
        size="sm"
        className="h-7 border-amber-700 bg-amber-400 text-amber-950 hover:bg-amber-300"
        onClick={() => stopMutation.mutate()}
        disabled={stopMutation.isPending}
      >
        {stopMutation.isPending ? "Stopping..." : "Stop Impersonating"}
      </Button>
    </div>
  );
}
