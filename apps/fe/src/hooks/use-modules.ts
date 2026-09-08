import { getModules } from "@/services/module/module-service";
import { useQuery } from "@tanstack/react-query";

export const MODULES_KEY = ["modules"];

// Archived modules keep working for records that already sit in them but are
// gone from pickers, so anything offering a choice wants the default.
export const useModules = ({ includeArchived = false } = {}) =>
  useQuery({
    queryKey: MODULES_KEY,
    queryFn: getModules,
    // The sidebar's one nav request writes this cache, so a picker mounting
    // inside that window reuses the rows instead of asking again.
    staleTime: 1000 * 60 * 5,
    select: (modules) =>
      includeArchived ? modules : modules.filter((m) => !m.isArchived),
  });
