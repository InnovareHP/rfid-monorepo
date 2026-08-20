import { PublicShell } from "@/components/public-shell";
import {
  getPublicSubscription,
  publicResubscribe,
  publicUnsubscribe,
} from "@/services/marketing/subscriber-service";
import { Button } from "@dashboard/ui/components/button";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Loader2, MailX, MailCheck } from "lucide-react";

export const PublicUnsubscribePage = () => {
  const { token } = useParams({ strict: false }) as { token: string };
  const queryClient = useQueryClient();

  const {
    data: subscription,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-subscription", token],
    queryFn: () => getPublicSubscription(token),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (next: "SUBSCRIBED" | "UNSUBSCRIBED") =>
      next === "UNSUBSCRIBED"
        ? publicUnsubscribe(token)
        : publicResubscribe(token),
    onSuccess: (result) =>
      queryClient.setQueryData(["public-subscription", token], result),
  });

  const unsubscribed = subscription?.status === "UNSUBSCRIBED";

  return (
    <PublicShell>
      <div className="w-full max-w-lg rounded-2xl bg-card p-8 shadow-lg">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-40" />
          </div>
        ) : isError || !subscription ? (
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              Link no longer valid
            </h1>
            <p className="text-sm text-muted-foreground">
              This unsubscribe link has expired or was already removed. No
              further action is needed.
            </p>
          </div>
        ) : (
          <div className="space-y-5 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-table-header">
              {unsubscribed ? (
                <MailX className="size-7 text-primary" />
              ) : (
                <MailCheck className="size-7 text-primary" />
              )}
            </span>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                {unsubscribed ? "You are unsubscribed" : "Unsubscribe"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {unsubscribed
                  ? `This address will no longer receive marketing email from ${subscription.organizationName}.`
                  : `This address currently receives marketing email from ${subscription.organizationName}.`}
              </p>
            </div>

            <Button
              type="button"
              variant={unsubscribed ? "outline" : "default"}
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate(unsubscribed ? "SUBSCRIBED" : "UNSUBSCRIBED")
              }
            >
              {mutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {unsubscribed ? "Resubscribe" : "Unsubscribe me"}
            </Button>

            <p className="text-xs text-muted-foreground">
              This does not affect appointment or account notifications.
            </p>
          </div>
        )}
      </div>
    </PublicShell>
  );
};
