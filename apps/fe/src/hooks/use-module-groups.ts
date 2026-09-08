import { getModuleGroups } from "@/services/module/module-group-service";
import { useQuery } from "@tanstack/react-query";

export const MODULE_GROUPS_KEY = ["module-groups"];

// The sidebar's one nav request writes this cache, so a picker mounting inside
// that window reuses the rows instead of asking again.
export const useModuleGroups = () =>
  useQuery({
    queryKey: MODULE_GROUPS_KEY,
    queryFn: getModuleGroups,
    staleTime: 1000 * 60 * 5,
  });
