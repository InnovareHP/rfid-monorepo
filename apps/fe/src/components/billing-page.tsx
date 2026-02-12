import { authClient } from "@/lib/auth-client";
import { formatCapitalize, ROLES, type Subscription } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { cn } from "@dashboard/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import type { Member } from "better-auth/plugins/organization";
import { Calendar, LogOut } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { PlansPage } from "./plans-page";

export function BillingPage({
  className,
  activeOrganizationId: propOrgId,
  activeSubscription: propSub,
  memberData: propMember,
  context: propContext,
  ...props
}: {
  activeOrganizationId?: string;
  activeSubscription?: Subscription;
  memberData?: Member;
  context?: "/_team" | "/billing";
} & React.ComponentProps<"div">) {
  const context = useRouteContext({ from: propContext ?? "/_team" }) as {
    activeOrganizationId: string;
    activeSubscription: Subscription;
    memberData: Member;
  };

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const subscriptions = queryClient.getQueryData<Subscription[]>([
    "subscription",
    context.activeOrganizationId,
  ]) as unknown as Subscription | null;

  const activeOrganizationId = propOrgId ?? context.activeOrganizationId;

  const memberData = queryClient.getQueryData([
    "member-data",
    activeOrganizationId,
  ]);

  const billingInfo = subscriptions && {
    currentPlan: subscriptions?.plan,
    billingCycle: "monthly",
    nextBillingDate: subscriptions?.periodEnd,
    status: subscriptions?.status,
  };

  const openBillingPortal = useCallback(async () => {
    if (!activeOrganizationId) return;

    const { data, error } = await authClient.subscription.billingPortal({
      referenceId: activeOrganizationId,
      returnUrl: `${window.location.href}`,
    });

    if (error) toast.error(error.message);
    if (data?.url) window.location.href = data.url;
  }, [activeOrganizationId]);

  const handleLogout = useCallback(async () => {
    try {
      await authClient.signOut();

      queryClient.clear();
      navigate({ to: "/login" });
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  }, [navigate]);

  if (!billingInfo) {
    return <PlansPage context={propContext} handleLogout={handleLogout} />;
  }

  return (
    <div
      className={cn("w-full max-w-7xl mx-auto p-6 space-y-8", className)}
      {...props}
    >
      <div className="text-center space-y-2 mb-12">
        <h1 className="text-4xl font-bold tracking-tight">
          Billing & Subscription
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Manage your subscription, payment methods, and view billing history
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">
                {formatCapitalize(billingInfo.currentPlan)}
              </span>

              <Badge
                variant={
                  billingInfo.status === "active" ||
                  billingInfo.status === "trialing"
                    ? "default"
                    : "secondary"
                }
              >
                {formatCapitalize(billingInfo.status)}
              </Badge>
            </div>

            {billingInfo.nextBillingDate &&
            (memberData as Member)?.role === ROLES.OWNER ? (
              <div className="flex items-center gap-2 text-sm mt-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Next billing:{" "}
                  {new Date(billingInfo.nextBillingDate).toLocaleDateString()}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm mt-2 text-muted-foreground">
                <span>Contact the owner to upgrade your plan</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={openBillingPortal}
            >
              Manage Billing
            </Button>

            {propContext === "/billing" && (
              <Button variant="ghost" className="flex-1" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
