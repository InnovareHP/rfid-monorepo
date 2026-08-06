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
import { Switch } from "@dashboard/ui/components/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BaaSignModal } from "./baa-sign-modal";

type Member = { role: string };

export function CompliancePage() {
  const context = useRouteContext({ from: "/_team" }) as {
    memberData: Member;
  };
  const queryClient = useQueryClient();
  const [signOpen, setSignOpen] = useState(false);

  const role = context.memberData?.role;
  const canManage = can(role, { compliance: ["manage"] });
  const canDownload = can(role, { compliance: ["download"] });

  const { data: status } = useQuery({
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

  if (!status) return null;

  if (!status.planSupportsHipaa) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>HIPAA compliance</CardTitle>
          <CardDescription>
            HIPAA mode and the Business Associate Agreement are available on the
            Scale plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="../billing">View plans</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { baa } = status;

  const downloadExecuted = async () => {
    window.open(await getSignedBaaUrl(), "_blank", "noopener");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>HIPAA mode</CardTitle>
          <CardDescription>
            Enforces the network allowlist, a signed Business Associate
            Agreement, and a second factor on every route that carries PHI.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="hipaa-mode">
              {status.hipaaEnabled ? "Enabled" : "Disabled"}
            </Label>
            <p className="text-sm text-muted-foreground">
              {status.hipaaEnabled
                ? "Enabling is permanent. Contact support to discuss changes."
                : "Once enabled, this cannot be turned off from the app."}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Business Associate Agreement</CardTitle>
            {baa.signed ? (
              <Badge variant="secondary">Signed</Badge>
            ) : baa.stale ? (
              <Badge variant="destructive">Update required</Badge>
            ) : (
              <Badge variant="destructive">Not signed</Badge>
            )}
          </div>
          <CardDescription>
            {baa.signed
              ? `Version ${baa.acceptedVersion}, executed ${new Date(
                  baa.acceptedAt as string
                ).toLocaleDateString()}.`
              : baa.stale
                ? "The Business Associate Agreement has been updated and must be signed again."
                : status.hipaaEnabled
                  ? "Access to records is blocked until the agreement is executed."
                  : `Version ${baa.version} is ready to sign.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {baa.signed && (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Legal entity</dt>
                <dd>{baa.companyLegalName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Signed by</dt>
                <dd>
                  {baa.signerName}, {baa.signerTitle}
                </dd>
              </div>
            </dl>
          )}

          <div className="flex flex-wrap gap-2">
            {!baa.signed &&
              (canManage ? (
                <Button
                  onClick={() => setSignOpen(true)}
                  disabled={!terms}
                >
                  Review &amp; sign BAA
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Only the organization owner can sign the BAA.
                </p>
              ))}

            {baa.signed && baa.documentAvailable && canDownload && (
              <Button variant="outline" onClick={downloadExecuted}>
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
