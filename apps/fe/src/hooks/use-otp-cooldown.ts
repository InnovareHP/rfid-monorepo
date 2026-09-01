import { useEffect, useState } from "react";

// Gates a resend button between code requests; the API throttles per email too.
export const useOtpCooldown = (seconds = 60) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining(remaining - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  return {
    remaining,
    isCooling: remaining > 0,
    start: () => setRemaining(seconds),
  };
};
