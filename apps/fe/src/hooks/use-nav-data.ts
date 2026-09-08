import { DASHBOARDS_KEY } from "@/hooks/use-dashboards";
import { MODULE_GROUPS_KEY } from "@/hooks/use-module-groups";
import { MODULES_KEY } from "@/hooks/use-modules";
import { getNavData } from "@/services/nav/nav-service";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const NAV_KEY = ["nav"];

// One request for everything the sidebar draws. The two payloads are written
// back under the keys their own features already own, so a module picker or the
// dashboards page reads this cache instead of fetching the same rows again.
export const useNavData = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: NAV_KEY,
    queryFn: async () => {
      const nav = await getNavData();

      queryClient.setQueryData(MODULES_KEY, nav.modules);
      queryClient.setQueryData(MODULE_GROUPS_KEY, nav.groups);
      queryClient.setQueryData(DASHBOARDS_KEY, nav.dashboards);

      return nav;
    },
    staleTime: 1000 * 60 * 5,
  });
};
