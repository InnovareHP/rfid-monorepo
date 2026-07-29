import { axiosClient } from "@/lib/axios-client";

export type FormFieldMapping = {
  fieldId: string;
  label: string;
  required: boolean;
};

export type MarketingForm = {
  id: string;
  organizationId: string;
  campaignId: string | null;
  name: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  moduleType: string;
  fieldMappings: FormFieldMapping[];
  submitButtonText: string;
  redirectUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BoardField = {
  id: string;
  fieldName: string;
  fieldType: string;
  fieldOrder: number;
};

export type PublicForm = {
  id: string;
  name: string;
  submitButtonText: string;
  fieldMappings: (FormFieldMapping & { fieldType: string })[];
};

export type PublicFormSubmitResult = {
  success: boolean;
  recordId: string;
  redirectUrl: string | null;
};

export const getForms = async (): Promise<MarketingForm[]> => {
  const response = await axiosClient.get("/api/marketing/forms");
  return response.data;
};

export const getForm = async (id: string): Promise<MarketingForm> => {
  const response = await axiosClient.get(`/api/marketing/forms/${id}`);
  return response.data;
};

export const getFormFields = async (id: string): Promise<BoardField[]> => {
  const response = await axiosClient.get(`/api/marketing/forms/${id}/fields`);
  return response.data;
};

export const createForm = async (data: {
  name: string;
  campaignId?: string;
  moduleType?: string;
  fieldMappings: FormFieldMapping[];
  submitButtonText?: string;
  redirectUrl?: string;
}): Promise<MarketingForm> => {
  const response = await axiosClient.post("/api/marketing/forms", data);
  return response.data;
};

export const updateForm = async (
  id: string,
  data: Partial<{
    name: string;
    campaignId: string;
    moduleType: string;
    fieldMappings: FormFieldMapping[];
    submitButtonText: string;
    redirectUrl: string;
  }>
): Promise<MarketingForm> => {
  const response = await axiosClient.patch(`/api/marketing/forms/${id}`, data);
  return response.data;
};

export const publishForm = async (id: string): Promise<MarketingForm> => {
  const response = await axiosClient.post(
    `/api/marketing/forms/${id}/publish`
  );
  return response.data;
};

export const deleteForm = async (id: string) => {
  const response = await axiosClient.delete(`/api/marketing/forms/${id}`);
  return response.data;
};

export const getPublicForm = async (slug: string): Promise<PublicForm> => {
  const response = await axiosClient.get(
    `/api/marketing/public/forms/${slug}`
  );
  return response.data;
};

export const submitPublicForm = async (
  slug: string,
  values: Record<string, string | null>
): Promise<PublicFormSubmitResult> => {
  const response = await axiosClient.post(
    `/api/marketing/public/forms/${slug}/submit`,
    { values }
  );
  return response.data;
};
