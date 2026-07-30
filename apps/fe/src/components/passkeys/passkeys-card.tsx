import { authClient } from "@/lib/auth-client";
import {
  createEnrollmentCode,
  getPasskeys,
  removePasskey,
} from "@/services/passkeys/passkeys-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Fingerprint, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function PasskeysCard() {
  const queryClient = useQueryClient();
  const [enrollmentCode, setEnrollmentCode] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const { data: passkeys, isLoading } = useQuery({
    queryKey: ["passkeys"],
    queryFn: getPasskeys,
  });

  const removeMutation = useMutation({
    mutationFn: removePasskey,
    onSuccess: async () => {
      toast.success("Passkey removed.");
      await queryClient.invalidateQueries({ queryKey: ["passkeys"] });
    },
    onError: () => toast.error("Could not remove that passkey."),
  });

  const codeMutation = useMutation({
    mutationFn: createEnrollmentCode,
    onSuccess: (grant) => setEnrollmentCode(grant.code),
    onError: () => toast.error("Could not create an enrollment code."),
  });

  const handleAddDevice = async () => {
    setAdding(true);
    const { error } = await authClient.passkey.addPasskey();
    setAdding(false);

    if (error) {
      toast.error(error.message ?? "Could not add a passkey.");
      return;
    }
    toast.success("Passkey added.");
    await queryClient.invalidateQueries({ queryKey: ["passkeys"] });
  };

  const deviceCount = passkeys?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Fingerprint className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Passkeys</span>
      </div>

      <div className="space-y-3 border-2 border-primary/30 rounded-lg p-4 bg-primary/10">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading devices...
          </div>
        ) : deviceCount === 0 ? (
          <p className="text-sm text-gray-600">
            No passkeys registered on this account yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {passkeys?.map((passkey) => (
              <li
                key={passkey.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-white p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {passkey.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    Added{" "}
                    {passkey.createdAt
                      ? new Date(passkey.createdAt).toLocaleDateString()
                      : "recently"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {passkey.backedUp && (
                    <Badge variant="secondary" className="text-xs">
                      Backed up
                    </Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    // Removing the only device would lock the account out.
                    disabled={deviceCount <= 1 || removeMutation.isPending}
                    onClick={() => removeMutation.mutate(passkey.id)}
                    aria-label={`Remove ${passkey.label}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={handleAddDevice}
            disabled={adding}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add this device
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => codeMutation.mutate()}
            disabled={codeMutation.isPending}
          >
            {codeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Get code for another device"
            )}
          </Button>
        </div>

        {enrollmentCode && (
          <div className="space-y-2 rounded-lg border-2 border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              Use this code on the other device within 10 minutes. Anyone who
              gets it can register a passkey on your account.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-xs">
                {enrollmentCode}
              </code>
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(enrollmentCode);
                  toast.success("Code copied.");
                }}
                aria-label="Copy enrollment code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
