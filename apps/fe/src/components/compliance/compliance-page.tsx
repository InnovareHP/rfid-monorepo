import { PageHeader } from "@/components/page-header";
import { can } from "@/lib/permissions";
import {
  getBaaTerms,
  getComplianceStatus,
  getSignedBaaUrl,
  updateComplianceSettings,
} from "@/services/compliance/compliance-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Label } from "@dashboard/ui/components/label";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { Switch } from "@dashboard/ui/components/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { Download, FileSignature, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BaaSignModal } from "./baa-sign-modal";

type Member = { role: string };

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export function CompliancePage() {
  const context = useRouteContext({ from: "/_team" }) as {
    memberData: Member;
  };
  const queryClient = useQueryClient();
  const [signOpen, setSignOpen] = useState(false);

  const role = context.memberData?.role;
  const canManage = can(role, { compliance: ["manage"] });
  const canDownload = can(role, { compliance: ["download"] });

  const { data: status, isLoading } = useQuery({
    queryKey: ["compliance"],
    queryFn: getComplianceStatus,
  });

  const { data: terms } = useQuery({
    queryKey: ["baa-terms"],
    queryFn: getBaaTerms,
    enabled: Boolean(status?.planSupportsHipaa),
  });

  const enableHipaa = useMutation({
    mutationFn: () => updateComplianceSettings({ hipaaEnabled: true }),
    onSuccess: (next) => {
      queryClient.setQueryData(["compliance"], next);
      toast.success("HIPAA mode enabled");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ?? "HIPAA mode could not be enabled"
      );
    },
  });

  if (isLoading || !status) {
    return (
      <div className="page-style">
        <PageHeader
          title="Compliance"
          description="HIPAA mode and the Business Associate Agreement for this organization."
        />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const { baa } = status;

  const downloadExecuted = async () => {
    window.open(await getSignedBaaUrl(), "_blank", "noopener");
  };

  const baaBadge = baa.signed ? (
    <Badge className="bg-emerald-100 text-emerald-800">Signed</Badge>
  ) : baa.stale ? (
    <Badge variant="destructive">Update required</Badge>
  ) : (
    <Badge variant="destructive">Not signed</Badge>
  );

  return (
    <div className="page-style">
      <PageHeader
        title="Compliance"
        description="HIPAA mode and the Business Associate Agreement for this organization."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand" />
            HIPAA mode
          </CardTitle>
          <CardDescription>
            Enforces the network allowlist, a signed Business Associate
            Agreement, and a second factor on every route that carries patient
            data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="hipaa-mode" className="flex items-center gap-2">
                {status.hipaaEnabled ? "Enabled" : "Disabled"}
                {status.hipaaEnabled && (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Label>
              <p className="text-sm text-muted-foreground">
                {status.hipaaEnabled
                  ? "Enabling is permanent. Contact support to discuss changes."
                  : canManage
                    ? "Once enabled, this cannot be turned off from the app."
                    : "Only the organization owner can enable HIPAA mode."}
              </p>
            </div>
            <Switch
              id="hipaa-mode"
              checked={status.hipaaEnabled}
              disabled={
                status.hipaaEnabled || !canManage || enableHipaa.isPending
              }
              onCheckedChange={() => enableHipaa.mutate()}
            />
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <dt className="text-sm text-muted-foreground">Record retention</dt>
              <dd className="mt-1 font-medium">
                {Math.round(status.retentionDays / 365)} years
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  ({status.retentionDays} days)
                </span>
              </dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt className="text-sm text-muted-foreground">Network allowlist</dt>
              <dd className="mt-1 font-medium">
                {status.ipAllowlist.length
                  ? `${status.ipAllowlist.length} ${status.ipAllowlist.length === 1 ? "entry" : "entries"}`
                  : "Open to any network"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-brand" />
              Business Associate Agreement
            </CardTitle>
            {baaBadge}
          </div>
          <CardDescription>
            {baa.signed
              ? `Version ${baa.acceptedVersion}, executed ${formatDate(baa.acceptedAt as string)}.`
              : baa.stale
                ? "The agreement has been updated and must be signed again. Until it is, this organization is treated as unsigned."
                : status.hipaaEnabled
                  ? "Access to records is blocked until the agreement is executed."
                  : `Version ${baa.version} is ready to sign.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {baa.signed && (
            <dl className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Legal entity</dt>
                <dd className="mt-1 font-medium">{baa.companyLegalName}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Signed by</dt>
                <dd className="mt-1 font-medium">
                  {baa.signerName}
                  <span className="text-muted-foreground">
                    {baa.signerTitle ? `, ${baa.signerTitle}` : ""}
                  </span>
                </dd>
              </div>
            </dl>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {!baa.signed &&
              (canManage ? (
                <Button onClick={() => setSignOpen(true)} disabled={!terms}>
                  <FileSignature className="mr-2 h-4 w-4" />
                  Review &amp; sign BAA
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Only the organization owner can sign the BAA.
                </p>
              ))}

            {baa.signed && baa.documentAvailable && canDownload && (
              <Button variant="outline" onClick={downloadExecuted}>
                <Download className="mr-2 h-4 w-4" />
                Download executed copy
              </Button>
            )}

            {baa.signed && !baa.documentAvailable && (
              <p className="text-sm text-muted-foreground">
                Recorded from a negotiated agreement executed outside the app.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {terms && (
        <BaaSignModal
          terms={terms}
          open={signOpen}
          onOpenChange={setSignOpen}
        />
      )}
    </div>
  );
}
