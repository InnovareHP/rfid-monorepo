import { axiosClient } from "@/lib/axios-client";

// Every csv now comes off the server already assembled; this only reads the
// blob and the name the response asked for.
export const requestCsv = async (
  url: string,
  params: Record<string, unknown>,
  fallbackName: string
) => {
  const response = await axiosClient.get(url, {
    params,
    responseType: "blob",
  });

  const disposition: string = response.headers["content-disposition"] ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);

  return {
    blob: response.data as Blob,
    filename: match?.[1] ?? fallbackName,
  };
};
