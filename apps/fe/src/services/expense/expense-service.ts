import { axiosClient } from "@/lib/axios-client";

export const getExpenseLogs = async (filters?: any) => {
  const response = await axiosClient.get("/api/liason/expense", {
    params: {
      ...filters,
      filter: filters?.filter ? JSON.stringify(filters.filter) : undefined,
    },
  });

  if (response.status !== 200) {
    throw new Error("Failed to fetch expense logs");
  }

  // Return response data directly - API should handle pagination and return { data, columns, nextPage }
  // If API doesn't return columns, provide empty array for compatibility
  const data = response.data;

  return {
    ...data,
    columns: data.columns || [],
  };
};

export const exportExpenseLogs = async (filters?: any) => {
  const response = await axiosClient.get("/api/liason/expense/export", {
    params: {
      ...filters,
      filter: filters?.filter ? JSON.stringify(filters.filter) : undefined,
    },
    responseType: "blob", // ✅ REQUIRED
  });

  if (response.status !== 200) {
    throw new Error("Failed to export expense logs");
  }

  const blob = new Blob([response.data], {
    type: "application/pdf",
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "expense-report.pdf";
  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
};

export const createExpenseLog = async (data: any) => {
  const response = await axiosClient.post("/api/liason/expense", {
    ...data,
  });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error("Failed to create expense log");
  }

  return response.data;
};

export const updateExpenseLog = async (id: string, data: any) => {
  const response = await axiosClient.put(`/api/liason/expense/${id}`, {
    id,
    ...data,
  });

  if (response.status !== 200) {
    throw new Error("Failed to update expense log");
  }

  return response.data;
};

export const deleteExpenseLog = async (id: string) => {
  const response = await axiosClient.delete(`/api/liason/expense/${id}`);

  if (response.status !== 200) {
    throw new Error("Failed to delete expense log");
  }

  return response.data;
};
