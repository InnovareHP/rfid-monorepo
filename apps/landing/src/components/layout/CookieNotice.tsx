import { Button } from "@dashboard/ui/components/button";
import { X } from "lucide-react";
import { useState } from "react";

const STORAGE_KEY = "refidly-cookie-notice";

// Rendered client:only, so localStorage is safe to read during init.
const wasAcknowledged = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "acknowledged";
  } catch {
    return true;
  }
};

export default function CookieNotice() {
  const [open, setOpen] = useState(() => !wasAcknowledged());

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "acknowledged");
    } catch {
      // Private-browsing storage denial only costs us the memory of the dismissal.
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-notice-title"
      className="fixed inset-x-4 bottom-4 z-70 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px]"
    >
      <div className="relative rounded-xl border border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss cookie notice"
          className="absolute top-4 right-4 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <h2
          id="cookie-notice-title"
          className="font-display pr-8 text-lg font-bold tracking-tight"
        >
          We value your privacy
        </h2>

        <p className="mt-3 text-[13px] leading-5 text-muted-foreground">
          Refidly sets only strictly necessary cookies for sign-in, security,
          and interface preferences. No advertising cookies, no third-party
          trackers, and nothing sold or shared. Read the{" "}
          <a href="/cookie-policy" className="legal-link">
            Cookie Policy
          </a>
          .
        </p>

        <Button onClick={dismiss} className="mt-5 w-full">
          Got it
        </Button>
      </div>
    </div>
  );
}
