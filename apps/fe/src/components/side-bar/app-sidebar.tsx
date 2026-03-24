import { NavMain } from "@/components/side-bar/nav-main";
import { NavUser } from "@/components/side-bar/nav-user";
import { TeamSwitcher } from "@/components/side-bar/team-switcher";
import { ROLES } from "@dashboard/shared";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@dashboard/ui/components/sidebar";
import { Link } from "@tanstack/react-router";
import { type User as BetterAuthUser } from "better-auth";
import type { Member, Organization } from "better-auth/plugins/organization";
import {
  CircuitBoard,
  DollarSign,
  FileText,
  Folder,
  HistoryIcon,
  Route,
  Settings,
  SquareTerminal,
  Target,
  Upload,
  Users,
} from "lucide-react";
import * as React from "react";

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
  const { state } = useSidebar();

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
          title: "Marketing",
          icon: CircuitBoard,
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
            ...(memberData?.role !== ROLES.LIASON
              ? [
                  {
                    title: "History Check",
                    url: `/${activeOrganizationId}/master-list/history`,
                    icon: HistoryIcon,
                  },
                ]
              : []),
            ...(memberData?.role !== ROLES.OWNER
              ? [
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
                ]
              : []),
          ],
        },
        ...(memberData?.role === ROLES.OWNER
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
        ...(memberData?.role === ROLES.OWNER
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
              title: "County Configuration",
              url: `/${activeOrganizationId}/county-config`,
              icon: Settings,
            },
            ...(memberData?.role === ROLES.OWNER
              ? [
                  // {
                  //   title: "Plans",
                  //   url: `/${activeOrganizationId}/plans`,
                  //   icon: Sparkles,
                  // },
                  // {
                  //   title: "Billing",
                  //   url: `/${activeOrganizationId}/settings/billing`,
                  //   icon: CreditCard,
                  // },
                ]
              : []),
          ],
        },
      ],
    }),
    [activeOrganizationId, memberData?.role]
  );

  const activeOrg = organizations.find((o) => o.id === activeOrganizationId);
  const orgLogo = activeOrg?.logo;

  // Preload both images for smooth switching (only once on mount)
  React.useEffect(() => {
    const rfidImage = new Image();
    rfidImage.src = "/login-page/rfid.png";
    const tarsierImage = new Image();
    tarsierImage.src = "/login-page/tarsier.png";

    // Cleanup function to abort loading if component unmounts
    return () => {
      rfidImage.src = "";
      tarsierImage.src = "";
    };
  }, []);

  // Use org logo if uploaded, otherwise fall back to default
  const logoSrc = React.useMemo(
    () =>
      state === "collapsed"
        ? "/login-page/tarsier.png"
        : "/login-page/rfid.png",
    [state, orgLogo]
  );

  // Memoize image style to prevent object recreation
  const imageStyle = React.useMemo(
    () => ({
      height: orgLogo
        ? state === "collapsed"
          ? "2.5rem"
          : "3.5rem"
        : state === "collapsed"
          ? "3rem"
          : "auto",
      width: orgLogo ? "auto" : state === "collapsed" ? "2rem" : "70%",
      maxWidth: "100%",
      objectFit: "contain" as const,
      objectPosition: "center" as const,
    }),
    [state, orgLogo]
  );

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="md:left-16 top-(--banner-height,0px) h-[calc(100vh-var(--banner-height,0px))] transition-[top,height,left] duration-300"
    >
      <SidebarHeader>
        <div className="mb-2 w-full overflow-hidden">
          <Link
            to="/$team"
            params={{ team: activeOrganizationId }}
            preload={false}
            className="w-full h-full flex items-center justify-center"
          >
            <img
              src={logoSrc}
              alt="Dashboard Logo"
              className="cursor-pointer transition-all duration-300 w-full h-full"
              loading="eager"
              decoding="async"
              style={imageStyle}
            />
          </Link>
        </div>

        <img
          src={orgLogo ?? logoSrc}
          alt="Dashboard Logo"
          className="cursor-pointer transition-all duration-300"
          loading="eager"
          decoding="async"
          style={imageStyle}
        />
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
      <SidebarRail />
    </Sidebar>
  );
}
