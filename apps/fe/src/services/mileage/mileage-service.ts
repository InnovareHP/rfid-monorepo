import { axiosClient } from "@/lib/axios-client";

export const getMileageLogs = async (filters?: any) => {
  const response = await axiosClient.get("/api/liason/mileage", {
    params: {
      ...filters,
      filter: filters?.filter ? JSON.stringify(filters.filter) : undefined,
    },
  });

  if (response.status !== 200) {
    throw new Error("Failed to fetch mileage logs");
  }

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

  if (response.status !== 200 && response.status !== 201) {
    throw new Error("Failed to create mileage log");
  }

  return response.data;
};

export const updateMileageLog = async (id: string, data: any) => {
  const response = await axiosClient.patch(`/api/liason/mileage/${id}`, {
    ...data,
  });

  if (response.status !== 200) {
    throw new Error("Failed to update mileage log");
  }

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

    // Check if all deletions were successful
    const failed = results.some((r) => r.status !== 200);
    if (failed) {
      throw new Error("Failed to delete some mileage logs");
    }

    return results.map((r) => r.data);
  }

  // Single delete
  const response = await axiosClient.delete(`/api/liason/mileage/${id}`);

  if (response.status !== 200) {
    throw new Error("Failed to delete mileage log");
  }

  return response.data;
};
