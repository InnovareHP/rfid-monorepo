import {
  listDemoHosts,
  setDemoHost,
  type DemoHost,
} from "@/services/admin/demo-service";
import { formatDateTime } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Switch } from "@dashboard/ui/components/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Rotation is deliberately visible: an admin who cannot see who is next up has
// no way to tell a fair rotation from a stuck one.
export function DemoHostsCard() {
  const queryClient = useQueryClient();

  const { data: hosts = [] } = useQuery({
    queryKey: ["demo-hosts"],
    queryFn: listDemoHosts,
  });

  const toggle = useMutation({
    mutationFn: ({ userId, demoEnabled }: Pick<DemoHost, "userId" | "demoEnabled">) =>
      setDemoHost(userId, demoEnabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["demo-hosts"] });
    },
    onError: () =>
      toast.error("Could not change the rotation. The host needs a booking page first."),
  });

  const enabled = hosts.filter((host) => host.demoEnabled);
  const nextUp = enabled.length > 1 ? enabled[0] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo hosts</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {nextUp && (
          <p className="text-sm text-muted-foreground">
            Next demo goes to <strong>{nextUp.name}</strong>.
          </p>
        )}

        {enabled.length === 1 && (
          <p className="text-sm text-muted-foreground">
            One host in the rotation, so every demo goes to {enabled[0].name}.
            Add a second to start rotating.
          </p>
        )}

        {!enabled.length && (
          <p className="text-sm text-destructive">
            No host in the rotation. The demo page cannot take a booking.
          </p>
        )}

        <div className="divide-y">
          {hosts.map((host) => (
            <div
              key={host.userId}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{host.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {host.email}
                </p>

                {!host.hasBookingPage && (
                  <Badge variant="outline" className="mt-1">
                    No booking page yet
                  </Badge>
                )}

                {host.demoLastAssignedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last assigned {formatDateTime(host.demoLastAssignedAt)}
                  </p>
                )}
              </div>

              <Switch
                checked={host.demoEnabled}
                disabled={!host.hasBookingPage || toggle.isPending}
                onCheckedChange={(demoEnabled) =>
                  toggle.mutate({ userId: host.userId, demoEnabled })
                }
                aria-label={`Demo rotation for ${host.name}`}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
