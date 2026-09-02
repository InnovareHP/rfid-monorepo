import {
  issueContractInvoice,
  type AdminOrganizationDetail,
} from "@/services/admin/admin-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, KeyRound, Pencil, Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OrganizationEntitlementDialog } from "./OrganizationEntitlementDialog";

const STRIPE_CUSTOMER_URL = "https://dashboard.stripe.com/customers";

export function OrganizationEntitlementCard({
  org,
}: {
  org: AdminOrganizationDetail;
}) {
  const { entitlement } = org;
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const invoice = useMutation({
    mutationFn: () => issueContractInvoice(org.id),
    onSuccess: (result) => {
      toast.success(
        result.hostedInvoiceUrl
          ? "Invoice issued and emailed to the organization"
          : "Invoice issued"
      );
      queryClient.invalidateQueries({
        queryKey: ["admin-organization", org.id],
      });
    },
    // The API refuses a second open invoice and says so; that message is more
    // use than a generic failure.
    onError: (error: { response?: { data?: { message?: string } } }) =>
      toast.error(
        error.response?.data?.message ?? "Could not issue the invoice"
      ),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="text-muted-foreground h-5 w-5" />
          Effective entitlement
        </CardTitle>
        <div className="flex items-center gap-2">
          {org.stripeCustomerId && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`${STRIPE_CUSTOMER_URL}/${org.stripeCustomerId}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Stripe
              </a>
            </Button>
          )}
          {entitlement.isCustom && (
            <Button
              variant="outline"
              size="sm"
              disabled={invoice.isPending}
              onClick={() => invoice.mutate()}
            >
              <Receipt className="h-4 w-4" />
              {invoice.isPending ? "Issuing..." : "Issue invoice"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={entitlement.isCustom ? "info" : "secondary"}>
            {entitlement.label}
          </Badge>
          {entitlement.isCustom && (
            <span className="text-muted-foreground text-xs">
              Negotiated contract, not a tier
            </span>
          )}
        </div>

        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase">
            Seat cap
          </p>
          <p className="text-foreground text-sm">{entitlement.seats}</p>
        </div>

        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase">
            Features
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {entitlement.features.length ? (
              entitlement.features.map((feature) => (
                <Badge key={feature} variant="outline">
                  {feature}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">None</span>
            )}
          </div>
        </div>

        <p className="text-muted-foreground text-xs">
          Resolved from the subscription row. A contract overrides the plan tier
          for every gate, and clearing it hands the tier back.
        </p>
      </CardContent>

      <OrganizationEntitlementDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        orgId={org.id}
        orgName={org.name}
        entitlement={entitlement}
      />
    </Card>
  );
}
