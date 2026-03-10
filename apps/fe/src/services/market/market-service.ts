import { axiosClient } from "@/lib/axios-client";

export const getMarketLogs = async (filters?: any) => {
  const response = await axiosClient.get("/api/liason/marketing", {
    params: {
      ...filters,
      filter: filters?.filter ? JSON.stringify(filters.filter) : undefined,
    },
  });

  // Return response data directly - API should handle pagination and return { data, columns, nextPage }
  // If API doesn't return columns, provide empty array for compatibility
  const data = response.data;

  return {
    ...data,
    columns: data.columns || [],
  };
};

export const createMarketLog = async (data: any) => {
  const response = await axiosClient.post("/api/liason/marketing", {
    ...data,
  });

  return response.data;
};

export const updateMarketLog = async (id: string, data: any) => {
  const response = await axiosClient.patch(`/api/liason/marketing/${id}`, {
    ...data,
  });

  return response.data;
};

export const deleteMarketLog = async (id: string) => {
  const response = await axiosClient.delete(`/api/liason/marketing/${id}`);

  return response.data;
};

export const getFacilityOptions = async () => {
  const response = await axiosClient.get(`/api/options/facility`);

  return response.data;
};
