import { NavMain } from "@/components/side-bar/nav-main";
import { NavUser } from "@/components/side-bar/nav-user";
import { TeamSwitcher } from "@/components/side-bar/team-switcher";
import { createLead } from "@/services/lead/lead-service";
import { ROLES } from "@dashboard/shared";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@dashboard/ui/components/sidebar";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type User as BetterAuthUser } from "better-auth";
import type { Member, Organization } from "better-auth/plugins/organization";
import {
  CircuitBoard,
  FileText,
  Folder,
  Settings2,
  SquareTerminal,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import AddRow from "../reusable-table/add-row";

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
  const { open, state } = useSidebar();
  const queryClient = useQueryClient();

  // Memoize navigation data to prevent recreation on every render
  const data = React.useMemo(
    () => ({
      navMain: [
        {
          title: "Overview",
          icon: SquareTerminal,
          isActive: true,
          items: [
            {
              title: "Master List",
              url: `/${activeOrganizationId}`,
            },
            {
              title: "Referral",
              url: `/${activeOrganizationId}/referral-analytics`,
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
            },
            {
              title: "Referral",
              url: `/${activeOrganizationId}/referral-list`,
            },
            ...(memberData?.role !== ROLES.LIASON
              ? [
                  {
                    title: "History Check",
                    url: `/${activeOrganizationId}/master-list/history`,
                  },
                ]
              : []),
            ...(memberData?.role !== ROLES.OWNER
              ? [
                  {
                    title: "Mileage Log",
                    url: `/${activeOrganizationId}/log/mileage`,
                  },
                  {
                    title: "Marketing Log",
                    url: `/${activeOrganizationId}/log/marketing`,
                  },
                  {
                    title: "Expense Log",
                    url: `/${activeOrganizationId}/log/expense`,
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
                  },
                  {
                    title: "Marketing Report",
                    url: `/${activeOrganizationId}/report/marketing`,
                  },
                  {
                    title: "Expense Report",
                    url: `/${activeOrganizationId}/report/expense`,
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
                  },
                ],
              },
            ]
          : []),
        {
          title: "Settings",
          url: `/${activeOrganizationId}/settings`,
          icon: Settings2,
          items: [
            {
              title: "Team",
              url: `/${activeOrganizationId}/team`,
            },
            {
              title: "County Config",
              url: `/${activeOrganizationId}/county-config`,
            },
            ...(memberData?.role === ROLES.OWNER
              ? [
                  {
                    title: "Plans",
                    url: `/${activeOrganizationId}/plans`,
                  },
                  {
                    title: "Billing",
                    url: `/${activeOrganizationId}/settings/billing`,
                  },
                ]
              : []),
          ],
        },
      ],
    }),
    [activeOrganizationId, memberData?.role]
  );

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

  // Memoize image source to prevent unnecessary recalculations
  const logoSrc = React.useMemo(
    () =>
      state === "collapsed"
        ? "/login-page/tarsier.png"
        : "/login-page/rfid.png",
    [state]
  );

  // Memoize image style to prevent object recreation
  const imageStyle = React.useMemo(
    () => ({
      height: state === "collapsed" ? "3rem" : "auto",
      width: state === "collapsed" ? "2rem" : "70%",
      objectFit: "contain" as const,
      objectPosition: "center" as const,
    }),
    [state]
  );

  const addLeadMutation = useMutation({
    mutationFn: (data: any) => createLead(data, "LEAD"),
    onMutate: async (newLead) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previousData = queryClient.getQueryData(["leads"]);
      queryClient.setQueryData(["leads"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: [
            {
              ...old.pages[0],
              data: [newLead[0], ...old.pages[0].data],
            },
            ...old.pages.slice(1),
          ],
        };
      });
      return { previousData };
    },
    onError: (_err, _newLead, context: any) => {
      queryClient.setQueryData(["leads"], context.previousData);
      toast.error("Failed to add lead.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  // Memoize callback to prevent recreation on every render
  const handleAddNewLead = React.useCallback(
    (value: string) => {
      const newLead = [
        {
          id: uuidv4(),
          record_name: value,
          status: "",
          activities_time: 0,
          create_contact: "",
          company: "",
          title: "",
          email: "",
          phone: "",
          last_interaction: "",
          active_sequences: 0,
        },
      ];
      addLeadMutation.mutate(newLead);
    },
    [addLeadMutation]
  );
  return (
    <Sidebar
      collapsible="icon"
      {...props}
      // This is the key: it forces the fixed sidebar to move down
      className="top-[var(--banner-height,0px)] h-[calc(100vh-var(--banner-height,0px))] transition-[top,height] duration-300"
    >
      <SidebarHeader>
        <div className="mb-2 w-full overflow-hidden flex items-center justify-center">
          <Link
            to="/$team"
            params={{ team: activeOrganizationId }}
            preload={false}
            className="block w-full h-full flex items-center justify-center"
          >
            <img
              src={logoSrc}
              alt="Dashboard Logo"
              className="cursor-pointer transition-all duration-300"
              loading="eager"
              decoding="async"
              style={imageStyle}
            />
          </Link>
        </div>
        <TeamSwitcher
          activeOrganizationId={activeOrganizationId}
          organizations={organizations}
        />
        {open && <AddRow isReferral={false} onAdd={handleAddNewLead} />}
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
