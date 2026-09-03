import type { NavItem } from "@/components/side-bar/nav-main";
import { useEntitlement } from "@/hooks/use-entitlement";
import { can } from "@/lib/permissions";
import type { Member } from "better-auth/plugins/organization";
import {
  Bell,
  CalendarClock,
  CreditCard,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import * as React from "react";

// Settings is its own surface: the rail swaps the sidebar to this tree instead
// of hanging it off the bottom of the work nav. Gating stays in one place here,
// the way the work nav owns its own, so the sidebar and the global search
// cannot drift apart.
export function useSettingsNavItems(
  activeOrganizationId: string,
  memberData: Member
): NavItem[] {
  // HIPAA mode and the BAA are a Scale feature, so the row is hidden rather
  // than shown leading to an upsell the plan cannot act on.
  const canUseHipaa = useEntitlement(activeOrganizationId).has("hipaa");

  return React.useMemo(
    () => [
      {
        title: "Personal",
        icon: UserRound,
        items: [
          {
            title: "Profile",
            url: `/${activeOrganizationId}/profile`,
            icon: UserRound,
          },
          {
            title: "Notifications",
            url: `/${activeOrganizationId}/notifications`,
            icon: Bell,
          },
        ],
      },
      {
        title: "Organization",
        icon: Users,
        items: [
          {
            title: "Team",
            url: `/${activeOrganizationId}/team`,
            icon: Users,
          },
          {
            title: "Booking",
            url: `/${activeOrganizationId}/settings/booking`,
            icon: CalendarClock,
          },
          ...(canUseHipaa && can(memberData?.role, { compliance: ["read"] })
            ? [
                {
                  title: "Compliance",
                  url: `/${activeOrganizationId}/settings/compliance`,
                  icon: ShieldCheck,
                },
              ]
            : []),
          ...(can(memberData?.role, { billing: ["manage_billing"] })
            ? [
                {
                  title: "Billing",
                  url: `/${activeOrganizationId}/settings/billing`,
                  icon: CreditCard,
                  // Changing plan is something you do from billing, not a
                  // separate settings destination.
                  items: [
                    {
                      title: "Plans",
                      url: `/${activeOrganizationId}/plans`,
                      icon: Sparkles,
                    },
                  ],
                },
              ]
            : []),
        ],
      },
    ],
    [activeOrganizationId, memberData?.role, canUseHipaa]
  );
}
