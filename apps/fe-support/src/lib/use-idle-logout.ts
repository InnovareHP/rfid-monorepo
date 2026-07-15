import { authClient } from "@/lib/auth-client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const IDLE_LIMIT_MS = 15 * 60 * 1000;
const RESET_THROTTLE_MS = 1000;
const EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

export function useIdleLogout(limitMs: number = IDLE_LIMIT_MS) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let timer: number | undefined;
    let lastReset = 0;

    const logout = async () => {
      try {
        await authClient.signOut();
      } finally {
        queryClient.clear();
        window.location.href = "/";
      }
    };

    const reset = () => {
      const now = Date.now();
      if (now - lastReset < RESET_THROTTLE_MS) return;
      lastReset = now;
      window.clearTimeout(timer);
      timer = window.setTimeout(logout, limitMs);
    };

    lastReset = -RESET_THROTTLE_MS;
    reset();
    for (const e of EVENTS) {
      window.addEventListener(e, reset, { passive: true });
    }
    return () => {
      window.clearTimeout(timer);
      for (const e of EVENTS) {
        window.removeEventListener(e, reset);
      }
    };
  }, [queryClient, limitMs]);
}
