import { axiosClient } from "@/lib/axios-client";
import type { LeadAnalyze, LeadHistoryItem } from "@dashboard/shared";

export interface ScannedCardResult {
  recordName: string;
  contactInfo: {
    name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  fields: Record<string, string | null>;
  columns: { id: string; fieldName: string; fieldType: string }[];
}

export const scanBusinessCard = async (
  file: File
): Promise<ScannedCardResult> => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await axiosClient.post("/api/boards/scan-card", formData);
  return response.data;
};

export const getLeads = async (filters: any) => {
  const response = await axiosClient.get("/api/boards", {
    params: {
      ...filters,
      filter: JSON.stringify(filters.filter),
      moduleType: "LEAD",
    },
  });

  return response.data;
};

export const getColumnOptions = async (moduleType?: string) => {
  const response = await axiosClient.get(`/api/boards/options`, {
    params: {
      moduleType: moduleType || "LEAD",
    },
  });

  return response.data;
};

export const getFollowUpSuggestions = async (recordId: string) => {
  const response = await axiosClient.get(`/api/boards/${recordId}/suggestions`);

  return response.data as {
    suggestions: {
      priority: "high" | "medium" | "low";
      action: string;
      reasoning: string;
      timing: string;
    }[];
    riskFactors: string[];
    summary: string;
  };
};

export const getLeadAnalysis = async (leadId: string, moduleType?: string) => {
  const response = await axiosClient.get(`/api/boards/${leadId}/analyze`, {
    params: {
      moduleType: moduleType || "LEAD",
    },
  });

  return response.data as LeadAnalyze;
};

export const getDropdownOptions = async (
  fieldKey: string,
  page?: number,
  limit?: number
) => {
  const response = await axiosClient.get(
    `/api/boards/field/${fieldKey}/options`,
    {
      params: {
        page: page,
        limit: limit,
      },
    }
  );

  return response.data as any;
};

export const createDropdownOption = async (
  fieldKey: string,
  option: string,
  color?: string
) => {
  const response = await axiosClient.post(
    `/api/boards/field/${fieldKey}/options`,
    {
      optionName: option,
      ...(color && { color }),
    }
  );

  return response.data;
};

export const seenLeads = async (recordId: string) => {
  const response = await axiosClient.post("/api/boards/notification-state", {
    recordId: recordId,
  });

  return response.data;
};

export const getSpecificLead = async (leadId: string, moduleType?: string) => {
  const response = await axiosClient.get(`/api/boards/${leadId}`, {
    params: {
      moduleType: moduleType || "LEAD",
    },
  });

  return response.data;
};

export const updateLead = async (
  recordId: string,
  fieldId: string,
  value: string,
  moduleType?: string
) => {
  const response = await axiosClient.patch(`/api/boards/${recordId}`, {
    value,
    fieldId: fieldId,
    moduleType: moduleType || "LEAD",
  });

  return response.data;
};

export const updateContactValues = async (
  fieldId: string,
  body: {
    contactNumber: string;
    email: string;
    address: string;
    value: string;
  }
) => {
  const response = await axiosClient.patch(
    `/api/boards/contact-form/${fieldId}`,
    body
  );

  return response.data;
};

export const createLead = async (
  data: any,
  moduleType?: string,
  options?: {
    initialValues?: Record<string, string | null>;
    personContact?: {
      fieldId: string;
      contactNumber?: string;
      email?: string;
      address?: string;
    };
  }
) => {
  const response = await axiosClient.post("/api/boards", {
    recordName: data[0].recordName,
    moduleType: moduleType || "LEAD",
    ...(options?.initialValues && { initialValues: options.initialValues }),
    ...(options?.personContact && { personContact: options.personContact }),
  });

  return response.data;
};

export const createColumn = async (
  fieldType: string,
  columnName: string,
  moduleType?: string
) => {
  const response = await axiosClient.post("/api/boards/column", {
    column_name: columnName,
    fieldType: fieldType,
    moduleType: moduleType || "LEAD",
  });

  return response.data;
};

export const deleteColumnField = async (
  columnId: string,
  moduleType?: string
) => {
  const response = await axiosClient.delete(`/api/boards/column/${columnId}`, {
    params: { moduleType: moduleType || "LEAD" },
  });

  return response.data;
};

export const getLeadHistory = async (filters: any, moduleType?: string) => {
  const response = await axiosClient.get(`/api/boards/history`, {
    params: { ...filters, moduleType: moduleType || "LEAD" },
  });

  return response.data;
};
export const getleadValueId = async (fieldId: string, value: string) => {
  const response = await axiosClient.get(
    `/api/boards/contact-info/${fieldId}`,
    {
      params: { value },
    }
  );

  return response.data;
};

export const restoreLeadHistory = async (
  leadId: string | undefined,
  historyId: string,
  eventType: string,
  moduleType?: string
) => {
  const response = await axiosClient.post(`/api/boards/restore-history`, {
    recordId: leadId,
    history_id: historyId,
    event_type: eventType,
    moduleType: moduleType || "LEAD",
  });

  return response.data;
};

export const deleteLead = async (columnIds: string[], moduleType?: string) => {
  const response = await axiosClient.delete(`/api/boards`, {
    data: {
      column_ids: columnIds,
      moduleType: moduleType || "LEAD",
    },
  });

  return response.data;
};

export const getLeadTimeline = async (
  leadId: string,
  limit: number,
  page: number,
  moduleType?: string
) => {
  const response = await axiosClient.get(
    `/api/boards/timeline/${leadId}?take=${limit}&page=${page}&moduleType=${moduleType || "LEAD"}`
  );

  return response.data;
};

export const createLeadTimeline = async (
  leadId: string,
  data: LeadHistoryItem,
  moduleType?: string
) => {
  const response = await axiosClient.post(`/api/boards/timeline/${leadId}`, {
    ...data,
    moduleType: moduleType || "LEAD",
  });

  return response.data;
};

export const editLeadTimeline = async (
  id: string,
  moduleType: string = "LEAD"
) => {
  const response = await axiosClient.patch(`/api/boards/timeline/${id}`, {
    moduleType: moduleType,
  });

  return response.data;
};

export const deleteLeadTimeline = async (
  id: string,
  moduleType: string = "LEAD"
) => {
  const response = await axiosClient.delete(`/api/boards/timeline/${id}`, {
    data: {
      moduleType: moduleType,
    },
  });

  return response.data;
};

export const importLeads = async (data: any, moduleType: string = "LEAD") => {
  const response = await axiosClient.post("/api/boards/csv-import", {
    excelData: data,
    moduleType: moduleType,
  });

  return response.data;
};

export const sendBulkEmail = async (data: {
  recordIds: string[];
  emailSubject: string;
  emailBody: string;
  moduleType?: string;
  send_via?: "AUTO" | "GMAIL" | "OUTLOOK";
}) => {
  const response = await axiosClient.post("/api/boards/bulk-email", data, {
    params: {
      moduleType: data.moduleType,
    },
  });
  return response.data as { sent: number; skipped: number; errors: number };
};

export interface Activity {
  id: string;
  title: string;
  description: string | null;
  activityType: "CALL" | "EMAIL" | "MEETING" | "NOTE";
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  dueDate: string | null;
  completedAt: string | null;
  recipientEmail: string | null;
  emailSubject: string | null;
  emailBody: string | null;
  emailSentAt: string | null;
  senderEmail: string | null;
  createdAt: string;
  createdBy: string;
  creator_email: string;
}

export const getActivities = async (
  recordId: string,
  page: number = 1,
  limit: number = 15
) => {
  const response = await axiosClient.get(`/api/boards/${recordId}/activities`, {
    params: { page, limit },
  });

  return response.data as { data: Activity[]; total: number };
};

export const createActivity = async (data: {
  recordId: string;
  title: string;
  description?: string;
  activityType: "CALL" | "EMAIL" | "MEETING" | "NOTE";
  dueDate?: string;
  recipientEmail?: string;
  emailSubject?: string;
  emailBody?: string;
  send_via?: "AUTO" | "GMAIL" | "OUTLOOK";
}) => {
  const response = await axiosClient.post("/api/boards/activities", data);
  return response.data;
};

export const completeActivity = async (
  activityId: string,
  data?: {
    emailBody?: string;
    emailSubject?: string;
    recipientEmail?: string;
    send_via?: "AUTO" | "GMAIL" | "OUTLOOK";
  }
) => {
  const response = await axiosClient.post(
    `/api/boards/activities/${activityId}/complete`,
    data || {}
  );
  return response.data;
};

export const updateActivity = async (
  activityId: string,
  data: {
    title?: string;
    description?: string;
    status?: string;
    dueDate?: string;
  }
) => {
  const response = await axiosClient.patch(
    `/api/boards/activities/${activityId}`,
    data
  );
  return response.data;
};

export const deleteActivity = async (activityId: string) => {
  const response = await axiosClient.delete(
    `/api/boards/activities/${activityId}`
  );

  return response.data;
};

export const getGmailAuthUrl = async () => {
  const response = await axiosClient.get("/api/boards/gmail/auth-url");
  return response.data as { url: string };
};

export const getGmailStatus = async () => {
  const response = await axiosClient.get("/api/boards/gmail/status");
  return response.data as { connected: boolean; email: string | null };
};

export const disconnectGmail = async () => {
  const response = await axiosClient.delete("/api/boards/gmail/disconnect");
  return response.data;
};

// ---- Outlook Integration ----

export const getOutlookAuthUrl = async () => {
  const response = await axiosClient.get("/api/boards/outlook/auth-url");
  return response.data as { url: string };
};

export const getOutlookStatus = async () => {
  const response = await axiosClient.get("/api/boards/outlook/status");
  return response.data as { connected: boolean; email: string | null };
};

export const disconnectOutlook = async () => {
  const response = await axiosClient.delete("/api/boards/outlook/disconnect");
  return response.data;
};
