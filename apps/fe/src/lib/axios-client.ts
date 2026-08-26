import { toast } from "@/lib/toast";
import axios from "axios";

export const axiosClient = axios.create({
  withCredentials: true,
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // The subscription guard answers with a code so every caller reports the
    // same reason without parsing a message it might refuse to keep stable.
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const code = (error.response.data as { code?: string } | undefined)?.code;

      if (code === "SUBSCRIPTION_READ_ONLY" || code === "SUBSCRIPTION_LOCKED") {
        toast.error("Your subscription has ended. Renew to make changes.");
      }
    }

    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const isAuthRoute = window.location.pathname.startsWith("/login") ||
        window.location.pathname.startsWith("/register") ||
        window.location.pathname.startsWith("/otp") ||
        window.location.pathname.startsWith("/reset-password");

      if (!isAuthRoute) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
