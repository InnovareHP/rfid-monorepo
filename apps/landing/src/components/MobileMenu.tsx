import { Button } from "@dashboard/ui/components/button";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { APP_URL } from "../config";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#why", label: "Why Refidly" },
  { href: "#how-it-works", label: "How It Works" },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div>
      <Button
        variant="outline"
        size="icon"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open && (
        <nav
          className="fixed inset-x-0 top-[72px] bottom-0 z-60 flex flex-col gap-1 border-t border-border bg-white p-6"
          aria-label="Mobile navigation"
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3.5 text-lg font-semibold hover:bg-muted"
            >
              {link.label}
            </a>
          ))}
          <Button asChild size="lg" className="mt-4">
            <a href={APP_URL}>Start free trial</a>
          </Button>
        </nav>
      )}
    </div>
  );
}
