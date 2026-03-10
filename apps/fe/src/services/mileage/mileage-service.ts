import { axiosClient } from "@/lib/axios-client";

export const getMileageLogs = async (filters?: any) => {
  const response = await axiosClient.get("/api/liason/mileage", {
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

export const createMileageLog = async (data: any) => {
  const response = await axiosClient.post("/api/liason/mileage", data);

  return response.data;
};

export const updateMileageLog = async (id: string, data: any) => {
  const response = await axiosClient.patch(`/api/liason/mileage/${id}`, {
    ...data,
  });

  return response.data;
};

export const deleteMileageLog = async (id: string | string[]) => {
  // If it's an array, delete multiple logs
  if (Array.isArray(id)) {
    // Delete each log sequentially (or you could implement a bulk delete endpoint)
    const results = await Promise.all(
      id.map((singleId) =>
        axiosClient.delete(`/api/liason/mileage/${singleId}`)
      )
    );

    return results.map((r) => r.data);
  }

  // Single delete
  const response = await axiosClient.delete(`/api/liason/mileage/${id}`);

  return response.data;
};
