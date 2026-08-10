import { Input } from "@dashboard/ui/components/input";
import { cn } from "@dashboard/ui/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

// Dots rather than words: the field reads as a password before anything is typed,
// and a masked value looks the same as its own placeholder.
const DOT_PLACEHOLDER = "••••••••••••";

// Spreads the rest of the props onto the input so a react-hook-form field passes
// straight through.
export function PasswordInput({
  className,
  placeholder = DOT_PLACEHOLDER,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        // Room for the toggle, so a long value never runs under it.
        className={cn("pr-10", className)}
        {...props}
      />

      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        // Off the tab order: it is a view control, and stopping between the
        // password and submit to skip a button is worse than reaching for it.
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md transition-colors"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
