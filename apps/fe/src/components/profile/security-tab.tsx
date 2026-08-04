import { PasskeysCard } from "@/components/passkeys/passkeys-card";
import { TwoFactorSettings } from "@/components/two-factor/two-factor-settings";
import { cn } from "@dashboard/ui/lib/utils";
import { ShieldCheck } from "lucide-react";
import {
  ActiveSessionsCard,
  type SessionRow,
} from "./active-sessions-card";
import { ChangePasswordCard } from "./change-password-card";
import { SectionCard } from "./section-card";

type SecurityTabProps = {
  twoFactorEnabled: boolean;
  sessions: SessionRow[];
  isLoadingSessions?: boolean;
  currentSessionToken?: string;
  onSignOut: () => void;
};

export function SecurityTab({
  twoFactorEnabled,
  sessions,
  isLoadingSessions,
  currentSessionToken,
  onSignOut,
}: SecurityTabProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <ChangePasswordCard />

        <SectionCard
          title="Two-Factor Authentication"
          description="Add an extra layer of security to your account."
          action={
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                twoFactorEnabled
                  ? "border-green-500 text-green-600"
                  : "border-gray-300 text-gray-500"
              )}
            >
              <ShieldCheck className="size-3.5" />
              {twoFactorEnabled ? "Enabled" : "Not enabled"}
            </span>
          }
        >
          <TwoFactorSettings enabled={twoFactorEnabled} />
        </SectionCard>
      </div>

      <div className="space-y-4">
        <SectionCard
          title="Passkeys"
          description="Sign in without a password on trusted devices."
        >
          <PasskeysCard />
        </SectionCard>

        <ActiveSessionsCard
          sessions={sessions}
          isLoading={isLoadingSessions}
          currentSessionToken={currentSessionToken}
          onSignOut={onSignOut}
        />
      </div>
    </div>
  );
}
