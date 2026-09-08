import { axiosClient } from "@/lib/axios-client";
import type { CustomAnalyticDashboard } from "@/services/custom-analytics/custom-analytic-dashboard-service";
import type { ModuleGroup } from "@/services/module/module-group-service";
import type { CrmModule } from "@/services/module/module-service";

export type NavData = {
  modules: CrmModule[];
  groups: ModuleGroup[];
  dashboards: CustomAnalyticDashboard[];
};

export const getNavData = async () => {
  const response = await axiosClient.get("/api/nav");

  return response.data as NavData;
};
