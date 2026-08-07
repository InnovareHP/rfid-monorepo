import { axiosClient } from "../../lib/axios-client";

type Visibility = "public" | "private";

export const uploadImage = async (
  image: File,
  visibility: Visibility = "private"
) => {
  const form = new FormData();
  form.append("image", image);

  const response = await axiosClient.post(`/api/image/upload`, form, {
    params: { visibility },
  });

  return response.data;
};

export const deleteImage = async (publicId: string) => {
  const response = await axiosClient.delete(`/api/image`, {
    params: { publicId },
  });

  return response.data;
};
