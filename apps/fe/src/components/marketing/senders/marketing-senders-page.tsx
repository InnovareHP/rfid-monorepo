import { PageHeader } from "@/components/PageHeader";
import {
  deleteSender,
  getSenders,
  verifySender,
  type SenderIdentity,
} from "@/services/marketing/sender-service";
import { Button } from "@dashboard/ui/components/button";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign, Building2, Globe, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatusPill, type StatusTone } from "../../reusable-table/status-pill";
import { DnsRecordsPanel } from "./dns-records-panel";
import { SenderSetupDialog } from "./sender-setup-dialog";

const SENDERS_KEY = ["marketing-senders"];

const STATUS_TONES: Record<SenderIdentity["status"], StatusTone> = {
  PENDING: "info",
  VERIFIED: "success",
  FAILED: "danger",
};

const STATUS_LABELS: Record<SenderIdentity["status"], string> = {
  PENDING: "Awaiting DNS",
  VERIFIED: "Verified",
  FAILED: "Failed",
};

const KIND_ICONS = {
  PERSONAL: AtSign,
  MANAGED_DOMAIN: Building2,
  CUSTOM_DOMAIN: Globe,
} as const;

export const MarketingSendersPage = () => {
  const queryClient = useQueryClient();
  const [setupOpen, setSetupOpen] = useState(false);

  const { data: senders = [], isLoading } = useQuery({
    queryKey: SENDERS_KEY,
    queryFn: getSenders,
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => verifySender(id),
    onSuccess: (sender) => {
      queryClient.invalidateQueries({ queryKey: SENDERS_KEY });
      toast[sender.status === "VERIFIED" ? "success" : "info"](
        sender.status === "VERIFIED"
          ? "Domain verified"
          : "Records are not visible yet. Try again shortly."
      );
    },
    onError: () => toast.error("Could not check verification"),
  });

  const deleteMutation = useMutation({
    mutationFn: (sender: SenderIdentity) => deleteSender(sender.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SENDERS_KEY });
      toast.success("Sender removed");
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Failed to remove sender";
      toast.error(message);
    },
  });

  return (
    <div className="page-style">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Senders"
          description="Where campaign email comes from, and where replies land."
        />

        <Button
          onClick={() => setSetupOpen(true)}
          className="bg-brand text-white hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" />
          Add Sender
        </Button>
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && senders.length === 0 && (
        <p className="rounded-lg border border-gray-200 p-8 text-center text-muted-foreground">
          No senders yet. Add one to send campaign email as your organization.
        </p>
      )}

      {senders.map((sender) => {
        const Icon = KIND_ICONS[sender.kind];

        return (
          <section
            key={sender.id}
            className="space-y-4 rounded-xl border border-gray-200 bg-white p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 text-gray-400" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {sender.label}
                    </h3>
                    <StatusPill
                      label={STATUS_LABELS[sender.status]}
                      tone={STATUS_TONES[sender.status]}
                    />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {sender.fromEmail}
                    {sender.replyTo && sender.replyTo !== sender.fromEmail
                      ? ` — replies to ${sender.replyTo}`
                      : ""}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-red-600"
                aria-label="Remove sender"
                onClick={() => deleteMutation.mutate(sender)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {/* A domain that never verified is only recoverable from here. */}
            {sender.status !== "VERIFIED" && sender.domain && (
              <DnsRecordsPanel
                sender={sender}
                isVerifying={verifyMutation.isPending}
                onVerify={() => verifyMutation.mutate(sender.id)}
              />
            )}
          </section>
        );
      })}

      <SenderSetupDialog open={setupOpen} onOpenChange={setSetupOpen} />
    </div>
  );
};
