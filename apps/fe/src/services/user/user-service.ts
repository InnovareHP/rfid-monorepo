import type { FormValues } from "@/components/onboarding/onboarding";
import { axiosClient } from "@/lib/axios-client";

export const onboardUser = async (data: FormValues) => {
  const response = await axiosClient.post("/api/user/onboarding", data);

  return response.data;
};
