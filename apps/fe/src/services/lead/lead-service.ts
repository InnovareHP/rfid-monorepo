import { axiosClient } from "@/lib/axios-client";
import type { LeadAnalyze, LeadHistoryItem } from "@dashboard/shared";

export interface ScannedCardResult {
  record_name: string;
  contactInfo: {
    name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  fields: Record<string, string | null>;
  columns: { id: string; field_name: string; field_type: string }[];
}

export const scanBusinessCard = async (file: File): Promise<ScannedCardResult> => {
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

  if (response.status !== 200) {
    throw new Error("Failed to fetch leads");
  }

  return response.data;
};

export const getColumnOptions = async (moduleType?: string) => {
  const response = await axiosClient.get(`/api/boards/options`, {
    params: {
      moduleType: moduleType || "LEAD",
    },
  });

  if (response.status !== 200) {
    throw new Error("Failed to fetch leads meta");
  }

  return response.data;
};

export const getFollowUpSuggestions = async (recordId: string) => {
  const response = await axiosClient.get(`/api/boards/${recordId}/suggestions`);

  if (response.status !== 200) {
    throw new Error("Failed to fetch follow-up suggestions");
  }

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

  if (response.status !== 200) {
    throw new Error("Failed to fetch lead analysis");
  }

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

  if (response.status !== 200) {
    throw new Error("Failed to fetch dropdown options");
  }

  return response.data as any;
};

export const createDropdownOption = async (
  fieldKey: string,
  option: string
) => {
  const response = await axiosClient.post(
    `/api/boards/field/${fieldKey}/options`,
    {
      option_name: option,
    }
  );

  return response.data;
};

export const seenLeads = async (recordId: string) => {
  const response = await axiosClient.post("/api/boards/notification-state", {
    record_id: recordId,
  });

  if (response.status !== 200) {
    throw new Error("Failed to seen leads");
  }

  return response.data;
};

export const getSpecificLead = async (leadId: string, moduleType?: string) => {
  const response = await axiosClient.get(`/api/boards/${leadId}`, {
    params: {
      moduleType: moduleType || "LEAD",
    },
  });

  if (response.status !== 200) {
    throw new Error("Failed to fetch specific lead");
  }

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
    field_id: fieldId,
    moduleType: moduleType || "LEAD",
  });

  if (response.status !== 200) {
    throw new Error("Failed to update lead");
  }

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

  if (response.status !== 200) {
    throw new Error("Failed to update lead");
  }

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
    record_name: data[0].record_name,
    moduleType: moduleType || "LEAD",
    ...(options?.initialValues && { initialValues: options.initialValues }),
    ...(options?.personContact && { personContact: options.personContact }),
  });

  return response.data;
};

export const createColumn = async (
  isReferral: boolean,
  column: string,
  name: string,
  moduleType?: string
) => {
  const response = await axiosClient.post("/api/boards/column", {
    isReferral: isReferral,
    column: column,
    name: name,
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

  if (response.status !== 200) {
    throw new Error("Failed to fetch lead history");
  }

  return response.data;
};
export const getleadValueId = async (fieldId: string, value: string) => {
  const response = await axiosClient.get(
    `/api/boards/contact-info/${fieldId}`,
    {
      params: { value },
    }
  );

  if (response.status !== 200) {
    throw new Error("Failed to fetch lead history");
  }

  return response.data;
};

export const restoreLeadHistory = async (
  lead_id: string | undefined,
  history_id: string,
  event_type: string,
  moduleType?: string
) => {
  const response = await axiosClient.post(`/api/boards/restore-history`, {
    lead_id: lead_id,
    history_id: history_id,
    event_type: event_type,
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

  if (response.status !== 200) {
    throw new Error("Failed to delete leads");
  }

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

  if (response.status !== 200) {
    throw new Error("Failed to fetch lead timeline");
  }

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

  if (response.status !== 200) {
    throw new Error("Failed to edit lead timeline");
  }

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

  if (response.status !== 200) {
    throw new Error("Failed to delete lead timeline");
  }

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
  record_ids: string[];
  email_subject: string;
  email_body: string;
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
  activity_type: "CALL" | "EMAIL" | "MEETING" | "NOTE";
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  due_date: string | null;
  completed_at: string | null;
  recipient_email: string | null;
  email_subject: string | null;
  email_body: string | null;
  email_sent_at: string | null;
  sender_email: string | null;
  created_at: string;
  created_by: string;
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

  if (response.status !== 200) {
    throw new Error("Failed to fetch activities");
  }

  return response.data as { data: Activity[]; total: number };
};

export const createActivity = async (data: {
  record_id: string;
  title: string;
  description?: string;
  activity_type: "CALL" | "EMAIL" | "MEETING" | "NOTE";
  due_date?: string;
  recipient_email?: string;
  email_subject?: string;
  email_body?: string;
  send_via?: "AUTO" | "GMAIL" | "OUTLOOK";
}) => {
  const response = await axiosClient.post("/api/boards/activities", data);
  return response.data;
};

export const completeActivity = async (
  activityId: string,
  data?: {
    email_body?: string;
    email_subject?: string;
    recipient_email?: string;
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
    due_date?: string;
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

  if (response.status !== 200) {
    throw new Error("Failed to delete activity");
  }

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
