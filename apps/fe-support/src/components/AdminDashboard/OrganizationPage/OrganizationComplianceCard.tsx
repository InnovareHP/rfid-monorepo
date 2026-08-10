import {
  downloadOrganizationBaa,
  type AdminOrganizationDetail,
} from "@/services/admin/admin-service";
import { formatDateTime } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@dashboard/ui/components/table";
import { useMutation } from "@tanstack/react-query";
import { Download, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function OrganizationComplianceCard({
  org,
}: {
  org: AdminOrganizationDetail;
}) {
  const { compliance } = org;
  const { agreement } = compliance;

  const download = useMutation({
    mutationFn: () => downloadOrganizationBaa(org.id, org.slug ?? org.id),
    onError: () => toast.error("No executed agreement to download"),
  });

  const rows = [
    {
      label: "HIPAA mode",
      value: compliance.hipaaEnabled ? (
        <Badge variant="success">Enabled</Badge>
      ) : (
        <Badge variant="outline">Off</Badge>
      ),
    },
    {
      label: "Plan allows HIPAA",
      value: compliance.planSupportsHipaa ? "Yes" : "No",
    },
    {
      label: "BAA accepted",
      value: compliance.baaAcceptedAt
        ? formatDateTime(compliance.baaAcceptedAt)
        : "Never",
    },
    { label: "BAA version", value: compliance.baaVersion ?? "—" },
    { label: "Retention", value: `${compliance.retentionDays} days` },
    { label: "Signer", value: agreement?.signerName ?? "—" },
    {
      label: "Signer title",
      value: agreement ? `${agreement.signerTitle} · ${agreement.signerEmail}` : "—",
    },
    { label: "Legal entity", value: agreement?.companyLegalName ?? "—" },
    { label: "Signed from", value: agreement?.ipAddress ?? "—" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="text-muted-foreground h-5 w-5" />
          Compliance
        </CardTitle>
        {agreement?.hasDocument && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => download.mutate()}
            disabled={download.isPending}
          >
            <Download className="h-4 w-4" />
            {download.isPending ? "Preparing..." : "Signed BAA"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* An org in HIPAA mode with no signed BAA is the state worth catching. */}
        {compliance.hipaaEnabled && !compliance.baaAcceptedAt && (
          <p className="text-destructive mb-3 text-sm font-medium">
            HIPAA mode is on with no executed BAA on file.
          </p>
        )}
        <Table>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="text-muted-foreground w-[40%] font-medium">
                  {row.label}
                </TableCell>
                <TableCell>{row.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
