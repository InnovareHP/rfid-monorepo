import { getModules } from "@/services/module/module-service";
import { useQuery } from "@tanstack/react-query";

// Archived modules keep working for records that already sit in them but are
// gone from pickers, so anything offering a choice wants the default.
export const useModules = ({ includeArchived = false } = {}) =>
  useQuery({
    queryKey: ["modules"],
    queryFn: getModules,
    select: (modules) =>
      includeArchived ? modules : modules.filter((m) => !m.isArchived),
  });
