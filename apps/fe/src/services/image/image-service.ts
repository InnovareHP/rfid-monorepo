import { axiosClient } from "@/lib/axios-client";

export const uploadImage = async (image: File) => {
  const form = new FormData();
  form.append("image", image);

  const response = await axiosClient.post(`/api/image/upload`, form);

  return response.data;
};

export const deleteImage = async (imageId: string) => {
  const response = await axiosClient.delete(`/api/image/${imageId}`);

  return response.data;
};
