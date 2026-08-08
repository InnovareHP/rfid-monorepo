import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Card } from "@dashboard/ui/components/card";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type IntegrationCardProps = {
  name: string;
  description: string;
  logo: ReactNode;
  connected: boolean;
  connectedDetail?: ReactNode;
  connectLabel?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  isConnecting?: boolean;
  isDisconnecting?: boolean;
  disabled?: boolean;
  children?: ReactNode;
};

// One provider per card: logo tile, name, state, and a single primary action.
export const IntegrationCard = ({
  name,
  description,
  logo,
  connected,
  connectedDetail,
  connectLabel = "Connect",
  onConnect,
  onDisconnect,
  isConnecting = false,
  isDisconnecting = false,
  disabled = false,
  children,
}: IntegrationCardProps) => (
  <Card className="flex flex-col gap-0 rounded-xl p-8 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div className="flex size-15 items-center justify-center rounded-[10px] border bg-muted p-2.5 shadow-sm">
        {logo}
      </div>

      {connected && (
        <Badge
          variant="outline"
          className="border-success/40 bg-success/10 font-medium text-success"
        >
          Connected
        </Badge>
      )}
    </div>

    <h2 className="mt-6 text-xl font-semibold leading-8 text-primary">{name}</h2>

    <p className="mt-1 text-sm text-muted-foreground">
      {connected && connectedDetail ? connectedDetail : description}
    </p>

    {children}

    <div className="mt-auto pt-6">
      {connected ? (
        <Button
          variant="outline"
          className="w-35"
          onClick={onDisconnect}
          disabled={isDisconnecting}
        >
          {isDisconnecting && <Loader2 className="size-4 animate-spin" />}
          Disconnect
        </Button>
      ) : (
        <Button
          className="w-35 font-bold"
          onClick={onConnect}
          disabled={disabled || isConnecting}
        >
          {isConnecting && <Loader2 className="size-4 animate-spin" />}
          {connectLabel}
        </Button>
      )}
    </div>
  </Card>
);
