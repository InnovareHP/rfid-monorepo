import { axiosClient } from "@/lib/axios-client";

// Every analytics export is the same trip: ask the API for a rendered document
// and hand the bytes to the browser. Rendered server side so the download
// carries the letterhead and selectable text, not a screenshot of the page.
export const downloadPdf = async (
  url: string,
  params: Record<string, unknown>,
  filename: string
) => {
  const response = await axiosClient.get(url, {
    params,
    responseType: "blob",
  });

  const objectUrl = URL.createObjectURL(
    new Blob([response.data], { type: "application/pdf" })
  );
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
