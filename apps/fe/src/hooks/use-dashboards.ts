import { getDashboards } from "@/services/custom-analytics/custom-analytic-dashboard-service";
import { useQuery } from "@tanstack/react-query";

// Same key the dashboards list page owns, so the sidebar reads its cache
// instead of issuing a second request on every route change.
export const DASHBOARDS_KEY = ["custom-analytic-dashboards"];

export const useDashboards = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: DASHBOARDS_KEY,
    queryFn: getDashboards,
    enabled,
  });
