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
  HistoryIcon,
  LayoutTemplate,
  MailCheck,
  MailPlus,
  MapPin,
  Megaphone,
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

// The CRM group is where board modules live. Organizations will be able to add
// their own, so these are mapped from a list rather than written out one by one;
// that list becomes an API response once user-created modules land.
const CRM_MODULES = [
  { title: "Master Marketing List", path: "master-list", icon: FileText },
  { title: "Referral Logs", path: "referral-list", icon: Users },
  { title: "Phonebook", path: "contacts", icon: Contact },
  { title: "Companies", path: "companies", icon: Building2 },
];

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
          items: [
            {
              title: "Referral Analytics",
              url: `/${activeOrganizationId}`,
              icon: FileText,
            },
            {
              title: "Master Marketing List Analytics",
              url: `/${activeOrganizationId}/master-list-analytics`,
              icon: Users,
            },
          ],
        },
        {
          title: "CRM",
          icon: Contact,
          items: CRM_MODULES.map((module) => ({
            title: module.title,
            url: `/${activeOrganizationId}/${module.path}`,
            icon: module.icon,
          })),
        },
        {
          title: "Tasks",
          url: `/${activeOrganizationId}/tasks`,
          icon: ClipboardList,
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
              // Audience and sending identity are what a campaign is built from,
              // so they hang off it instead of sitting as siblings.
              items: [
                {
                  title: "Groups",
                  url: `/${activeOrganizationId}/marketing/groups`,
                  icon: Users,
                },
                {
                  title: "Senders",
                  url: `/${activeOrganizationId}/marketing/senders`,
                  icon: MailCheck,
                },
              ],
            },
            {
              title: "Blasts",
              url: `/${activeOrganizationId}/marketing/blasts`,
              icon: MailPlus,
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
                title: "History",
                url: `/${activeOrganizationId}/history`,
                icon: HistoryIcon,
              },
            ]
          : []),
        // Renamed from "Marketing": these are the field logs, and two sibling
        // categories both called Marketing gave no way to tell them apart.
        ...(can(memberData?.role, { log: ["create"] })
          ? [
              {
                title: "Logs",
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
                url: `/${activeOrganizationId}/import/master-list`,
                icon: Upload,
              },
            ]
          : []),
        {
          title: "Settings",
          icon: Settings,
          // No row for /settings itself: that route is a layout with a bare
          // Outlet and no index child, so it renders blank.
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
