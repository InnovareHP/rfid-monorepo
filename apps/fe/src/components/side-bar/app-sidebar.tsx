import { NavMain } from "@/components/side-bar/nav-main";
import { NavUser } from "@/components/side-bar/nav-user";
import { TeamSwitcher } from "@/components/side-bar/team-switcher";
import { useEntitlement } from "@/hooks/use-entitlement";
import { can } from "@/lib/permissions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@dashboard/ui/components/sidebar";
import { Link } from "@tanstack/react-router";
import { type User as BetterAuthUser } from "better-auth";
import type { Member, Organization } from "better-auth/plugins/organization";
import {
  Building2,
  CalendarClock,
  CircuitBoard,
  ClipboardList,
  Contact,
  CreditCard,
  DollarSign,
  FileText,
  Folder,
  HistoryIcon,
  LayoutTemplate,
  Megaphone,
  MailPlus,
  MapPin,
  Route,
  Settings,
  ShieldCheck,
  Sparkles,
  SquareTerminal,
  Target,
  Upload,
  Users,
} from "lucide-react";
import * as React from "react";

const BRAND_WORDMARK =
  "/branding/Wordmark/Refidly%20%5BWordmark%5D%20-%20Colored%20-%20Copy.png";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  activeOrganizationId: string;
  memberData: Member;
  organizations: Organization[];
  user: BetterAuthUser;
};
export function AppSidebar({
  activeOrganizationId,
  memberData,
  organizations,
  user,
  ...props
}: AppSidebarProps) {
  // HIPAA mode and the BAA are a Scale feature, so the tab is hidden rather
  // than shown leading to an upsell the plan cannot act on.
  const canUseHipaa = useEntitlement(activeOrganizationId).has("hipaa");

  const data = React.useMemo(
    () => ({
      navMain: [
        {
          title: "Overview",
          icon: SquareTerminal,
          isActive: true,
          items: [
            {
              title: "Referral Analytics",
              url: `/${activeOrganizationId}`,
              icon: FileText,
            },
            {
              title: "Master List Analytics",
              url: `/${activeOrganizationId}/master-list-analytics`,
              icon: Users,
            },
          ],
        },
        {
          title: "CRM",
          icon: Contact,
          items: [
            {
              title: "Master List",
              url: `/${activeOrganizationId}/master-list`,
              icon: FileText,
            },
            {
              title: "Referral",
              url: `/${activeOrganizationId}/referral-list`,
              icon: Users,
            },
            {
              title: "Contacts",
              url: `/${activeOrganizationId}/contacts`,
              icon: Contact,
            },
            {
              title: "Companies",
              url: `/${activeOrganizationId}/companies`,
              icon: Building2,
            },
          ],
        },
        {
          title: "Productivity",
          icon: ClipboardList,
          items: [
            {
              title: "Tasks",
              url: `/${activeOrganizationId}/tasks`,
              icon: ClipboardList,
            },
          ],
        },
        {
          title: "Marketing Hub",
          icon: MailPlus,
          items: [
            {
              title: "Forms",
              url: `/${activeOrganizationId}/marketing/forms`,
              icon: FileText,
            },
            {
              title: "Campaigns",
              url: `/${activeOrganizationId}/marketing/campaigns`,
              icon: Megaphone,
            },
            {
              title: "Blasts",
              url: `/${activeOrganizationId}/marketing/blasts`,
              icon: MailPlus,
            },
            {
              title: "Groups",
              url: `/${activeOrganizationId}/marketing/groups`,
              icon: Users,
            },
            {
              title: "Landing Pages",
              url: `/${activeOrganizationId}/marketing/landing-pages`,
              icon: LayoutTemplate,
            },
          ],
        },
        ...(can(memberData?.role, { report: ["read"] })
          ? [
              {
                title: "Records",
                icon: HistoryIcon,
                items: [
                  {
                    title: "History Check",
                    url: `/${activeOrganizationId}/history`,
                    icon: HistoryIcon,
                  },
                ],
              },
            ]
          : []),
        ...(can(memberData?.role, { log: ["create"] })
          ? [
              {
                title: "Marketing",
                icon: CircuitBoard,
                items: [
                  {
                    title: "Mileage Log",
                    url: `/${activeOrganizationId}/log/mileage`,
                    icon: Route,
                  },
                  {
                    title: "Marketing Log",
                    url: `/${activeOrganizationId}/log/marketing`,
                    icon: Target,
                  },
                  {
                    title: "Expense Log",
                    url: `/${activeOrganizationId}/log/expense`,
                    icon: DollarSign,
                  },
                ],
              },
            ]
          : []),
        ...(can(memberData?.role, { report: ["read"] })
          ? [
              {
                title: "Reports",
                icon: FileText,
                items: [
                  {
                    title: "Mileage Report",
                    url: `/${activeOrganizationId}/report/mileage`,
                    icon: Route,
                  },
                  {
                    title: "Marketing Report",
                    url: `/${activeOrganizationId}/report/marketing`,
                    icon: Target,
                  },
                  {
                    title: "Expense Report",
                    url: `/${activeOrganizationId}/report/expense`,
                    icon: DollarSign,
                  },
                ],
              },
            ]
          : []),
        ...(can(memberData?.role, { record: ["import"] })
          ? [
              {
                title: "Import",
                icon: Folder,
                items: [
                  {
                    title: "Master List",
                    url: `/${activeOrganizationId}/import/master-list`,
                    icon: Upload,
                  },
                ],
              },
            ]
          : []),
        {
          title: "Settings",
          url: `/${activeOrganizationId}/settings`,
          icon: Settings,
          items: [
            {
              title: "Team",
              url: `/${activeOrganizationId}/team`,
              icon: Users,
            },
            {
              title: "Counties",
              url: `/${activeOrganizationId}/county-config`,
              icon: MapPin,
            },
            {
              title: "Booking",
              url: `/${activeOrganizationId}/settings/booking`,
              icon: CalendarClock,
            },
            ...(canUseHipaa
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
                    title: "Plans",
                    url: `/${activeOrganizationId}/plans`,
                    icon: Sparkles,
                  },
                  {
                    title: "Billing",
                    url: `/${activeOrganizationId}/settings/billing`,
                    icon: CreditCard,
                  },
                ]
              : []),
          ],
        },
      ],
    }),
    [activeOrganizationId, memberData?.role, canUseHipaa]
  );

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="md:left-16 top-(--banner-height,0px) h-[calc(100vh-var(--banner-height,0px))] transition-[top,height,left] duration-150 ease-[cubic-bezier(0.2,0,0,1)]"
    >
      <SidebarHeader>
        <div className="mb-2 w-full overflow-hidden group-data-[collapsible=icon]:hidden">
          <Link
            to="/$team"
            params={{ team: activeOrganizationId }}
            preload={false}
            className="flex h-full w-full items-center justify-start"
          >
            <img
              src={BRAND_WORDMARK}
              alt="Dashboard Logo"
              className="h-auto w-[70%] max-w-full cursor-pointer object-contain object-left"
              loading="eager"
              decoding="async"
            />
          </Link>
        </div>

        <TeamSwitcher
          activeOrganizationId={activeOrganizationId}
          organizations={organizations}
        />
        {/* {open && <AddRow isReferral={false} onAdd={handleAddNewLead} />} */}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} activeOrganizationId={activeOrganizationId} />
      </SidebarFooter>
    </Sidebar>
  );
}
