import { Button } from "@dashboard/ui/components/button";
import { LogOut } from "lucide-react";

const BRAND_WORDMARK = "/branding/Full/Refidly%20[Full]%20-%20Colored%201.png";

// The standalone /billing route renders outside the team shell, so it carries no
// sidebar and no logo. Both of its states — plan picker and active subscription —
// mount this so the page is recognisably Refidly either way.
export function BillingTopBar({ onLogout }: { onLogout?: () => void }) {
  return (
    <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-border sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* The asset is a square canvas; this box crops it to the designed
            247x67 band, matching the error pages. */}
        <div className="relative aspect-[247/67] w-[132px] overflow-hidden">
          <img
            src={BRAND_WORDMARK}
            alt="Refidly — See it. Track it. Move it."
            className="absolute left-0 top-[-134.86%] h-[367.89%] w-full max-w-none"
          />
        </div>

        {onLogout && (
          <Button variant="ghost" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        )}
      </div>
    </nav>
  );
}
