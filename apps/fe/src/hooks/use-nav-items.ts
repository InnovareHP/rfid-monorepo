import type { NavItem } from "@/components/side-bar/nav-main";
import { useDashboards } from "@/hooks/use-dashboards";
import { useEntitlement } from "@/hooks/use-entitlement";
import { useModules } from "@/hooks/use-modules";
import { moduleIcon } from "@/lib/helper/module-icons";
import { moduleParam, modulePath } from "@/lib/helper/module-route";
import { can } from "@/lib/permissions";
import type { CustomAnalyticDashboard } from "@/services/custom-analytics/custom-analytic-dashboard-service";
import type { Member } from "better-auth/plugins/organization";
import {
  CalendarClock,
  ChartSpline,
  CircuitBoard,
  ClipboardList,
  Contact,
  CreditCard,
  DollarSign,
  FileBarChart,
  FileText,
  HistoryIcon,
  LayoutTemplate,
  MailCheck,
  MailPlus,
  Mailbox,
  Megaphone,
  Plus,
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

// Past this the group stops reading as a list and starts scrolling.
const NAV_DASHBOARD_LIMIT = 5;

// The nav tree is the single source of role and entitlement gating, so the
// sidebar and the global search cannot drift apart.
export function useNavItems(
  activeOrganizationId: string,
  memberData: Member
): NavItem[] {
  // HIPAA mode and the BAA are a Scale feature, so the tab is hidden rather
  // than shown leading to an upsell the plan cannot act on.
  const entitlement = useEntitlement(activeOrganizationId);
  const canUseHipaa = entitlement.has("hipaa");
  const canExport = entitlement.has("export");
  const canUseCustomReporting = entitlement.has("custom_reporting");
  const canUseAdvancedAnalytics = entitlement.has("advanced_analytics");

  const { data: modules = [] } = useModules();
  const { data: dashboards = [] } = useDashboards({
    enabled: canUseCustomReporting,
  });
  const canManageAnalytics = can(memberData?.role, { analytics: ["manage"] });

  const data = React.useMemo(() => {
    // A module's seeded page always shows; hand-built dashboards fill what is
    // left, so adding a sixth never pushes the analytics pages out of the nav.
    const moduleKeyById = new Map(modules.map((m) => [m.id, m.key]));
    const navDashboards = [
      ...dashboards.filter((d) => d.isDefault),
      ...dashboards.filter((d) => !d.isDefault).slice(0, NAV_DASHBOARD_LIMIT),
    ];

    // A seeded page owns the module analytics route, which also lists that
    // module's charts; anything else is a plain dashboard view.
    const dashboardUrl = (dashboard: CustomAnalyticDashboard) => {
      const moduleKey = dashboard.moduleId
        ? moduleKeyById.get(dashboard.moduleId)
        : undefined;

      return dashboard.isDefault && moduleKey
        ? `/${activeOrganizationId}/records/${moduleParam(moduleKey)}/analytics`
        : `/${activeOrganizationId}/analytics/custom/dashboards/${dashboard.id}`;
    };

    return {
      navMain: [
        {
          title: "Overview",
          icon: SquareTerminal,
          // Analytics is a paid feature, so the entries are hidden rather than
          // leading to a lock screen.
          // Every analytics page is a dashboard row now, so renaming one renames
          // the nav entry instead of leaving a hardcoded title beside it.
          items: canUseCustomReporting
            ? [
                ...navDashboards.map((dashboard) => ({
                  title: dashboard.name,
                  url: dashboardUrl(dashboard),
                  icon: dashboard.isDefault ? ChartSpline : LayoutTemplate,
                })),
                // A hand-built report with no dashboard row of its own, so it
                // is listed explicitly or it has no way in.
                {
                  title: "Liaison Performance",
                  url: `/${activeOrganizationId}/liaison-performance`,
                  icon: Target,
                },
                ...(canManageAnalytics
                  ? [
                      {
                        title: "New Dashboard",
                        url: `/${activeOrganizationId}/analytics/custom/dashboards?new=true`,
                        icon: Plus,
                      },
                    ]
                  : []),
              ]
            : // Dashboards are Scale-only; a Growth organization keeps the
              // built-in pages its plan does entitle it to.
              canUseAdvancedAnalytics
              ? [
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
                  {
                    title: "Liaison Performance",
                    url: `/${activeOrganizationId}/liaison-performance`,
                    icon: Target,
                  },
                ]
              : [],
        },
        {
          title: "CRM",
          icon: Contact,
          // New Module sits last so the group reads as the modules you have,
          // then the way to add one.
          items: [
            ...modules.map((module) => ({
              title: module.label,
              url: `/${activeOrganizationId}/${modulePath(module.key)}`,
              icon: moduleIcon(module.icon),
            })),
            {
              title: "New Module",
              url: `/${activeOrganizationId}/records/new`,
              icon: Plus,
            },
          ],
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
                  title: "Subscribers",
                  url: `/${activeOrganizationId}/marketing/subscribers`,
                  icon: Mailbox,
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
                  // Scale only, so the entry is hidden rather than leading to a
                  // refusal the plan cannot act on.
                  ...(canUseCustomReporting
                    ? [
                        {
                          title: "Custom Reports",
                          url: `/${activeOrganizationId}/report/custom`,
                          icon: FileBarChart,
                        },
                        {
                          title: "Custom Analytics",
                          // The dashboards list is the front door: a chart is
                          // created, edited and deleted on the dashboard it
                          // sits on, so a separate chart registry is gone.
                          url: `/${activeOrganizationId}/analytics/custom/dashboards`,
                          icon: ChartSpline,
                        },
                      ]
                    : []),
                ],
              },
            ]
          : []),
        ...(canExport && can(memberData?.role, { record: ["import"] })
          ? [
              {
                title: "Import",
                url: `/${activeOrganizationId}/import`,
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
              title: "Booking",
              url: `/${activeOrganizationId}/settings/booking`,
              icon: CalendarClock,
            },
            // Renaming, reordering and deleting dashboards happens here; the
            // Overview rows are only for opening them.

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
    };
  }, [
      activeOrganizationId,
      memberData?.role,
      canUseHipaa,
      canExport,
      canUseCustomReporting,
      canUseAdvancedAnalytics,
      canManageAnalytics,
      modules,
      dashboards,
  ]);

  return data.navMain;
}
