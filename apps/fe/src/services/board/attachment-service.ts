import { axiosClient } from "@/lib/axios-client";

export type FieldAttachment = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileKey: string;
  createdAt: string;
  uploadedBy: string;
  url: string;
};

export const getFieldAttachments = async (
  recordId: string,
  fieldId: string
) => {
  const { data } = await axiosClient.get<FieldAttachment[]>(
    `/api/boards/${recordId}/attachments/${fieldId}`
  );
  return data;
};

export const uploadAttachment = async (
  recordId: string,
  fieldId: string,
  file: File,
  moduleType = "LEAD"
) => {
  const form = new FormData();
  form.append("file", file);
  form.append("fieldId", fieldId);
  form.append("moduleType", moduleType);

  const { data } = await axiosClient.post<FieldAttachment>(
    `/api/boards/${recordId}/attachments`,
    form
  );
  return data;
};

export const deleteAttachment = async (
  attachmentId: string,
  moduleType = "LEAD"
) => {
  const { data } = await axiosClient.delete(
    `/api/boards/attachments/${attachmentId}`,
    { params: { moduleType } }
  );
  return data;
};
