import { axiosClient } from "@/lib/axios-client";

export const getMarketLogs = async (filters?: any) => {
  const response = await axiosClient.get("/api/liason/marketing", {
    params: {
      ...filters,
      filter: filters?.filter ? JSON.stringify(filters.filter) : undefined,
    },
  });

  if (response.status !== 200) {
    throw new Error("Failed to fetch market logs");
  }

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

  if (response.status !== 200 && response.status !== 201) {
    throw new Error("Failed to create market log");
  }

  return response.data;
};

export const updateMarketLog = async (id: string, data: any) => {
  const response = await axiosClient.patch(`/api/liason/marketing/${id}`, {
    ...data,
  });

  if (response.status !== 200) {
    throw new Error("Failed to update market log");
  }

  return response.data;
};

export const deleteMarketLog = async (id: string) => {
  const response = await axiosClient.delete(`/api/liason/marketing/${id}`);

  if (response.status !== 200) {
    throw new Error("Failed to delete mileage log");
  }

  return response.data;
};

export const getFacilityOptions = async () => {
  const response = await axiosClient.get(`/api/options/facility`);

  if (response.status !== 200) {
    throw new Error("Failed to fetch market log options");
  }

  return response.data;
};
