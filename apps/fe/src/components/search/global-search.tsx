import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useNavItems } from "@/hooks/use-nav-items";
import { flattenNavItems, searchNavEntries } from "@/lib/helper/nav-search";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@dashboard/ui/components/command";
import { useNavigate } from "@tanstack/react-router";
import type { Member } from "better-auth/plugins/organization";
import * as React from "react";

const IS_MAC =
  typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");

// The input keeps its own shell rather than the divider CommandInput ships with,
// so it reads as a field in the header instead of the top of a dialog.
const INPUT_SHELL =
  "relative overflow-visible bg-transparent [&_[data-slot=command-input-wrapper]]:h-9 [&_[data-slot=command-input-wrapper]]:rounded-lg [&_[data-slot=command-input-wrapper]]:border [&_[data-slot=command-input-wrapper]]:bg-muted/50 [&_[data-slot=command-input-wrapper]]:px-3";

type GlobalSearchProps = {
  activeOrganizationId: string;
  memberData: Member;
};

export const GlobalSearch = React.memo(function GlobalSearch({
  activeOrganizationId,
  memberData,
}: GlobalSearchProps) {
  const navigate = useNavigate();
  const navItems = useNavItems(activeOrganizationId, memberData);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  // Results settle once typing pauses, so a keystroke never costs a filter pass.
  const settledQuery = useDebouncedValue(query, 200);

  const entries = React.useMemo(() => flattenNavItems(navItems), [navItems]);
  const results = React.useMemo(
    () => searchNavEntries(entries, settledQuery),
    [entries, settledQuery]
  );

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const handleSelect = (url: string) => {
    close();
    inputRef.current?.blur();
    navigate({ to: url });
  };

  return (
    <div
      ref={containerRef}
      className={`relative hidden transition-[width] duration-200 ease-out lg:block motion-reduce:transition-none ${
        open ? "w-[26rem]" : "w-72"
      }`}
    >
      <Command
        shouldFilter={false}
        className={INPUT_SHELL}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          close();
          inputRef.current?.blur();
        }}
      >
        <CommandInput
          ref={inputRef}
          placeholder="Search pages..."
          value={query}
          onValueChange={setQuery}
          onFocus={() => setOpen(true)}
        />

        {!open && (
          <kbd className="bg-background text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border px-1.5 py-0.5 text-[10px]">
            {IS_MAC ? "\u2318" : "Ctrl "}K
          </kbd>
        )}

        {open && (
          <div className="bg-popover absolute top-full right-0 z-50 mt-2 w-full overflow-hidden rounded-xl border shadow-lg">
            <CommandList className="max-h-80">
              <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
                No pages found.
              </CommandEmpty>

              <CommandGroup
                heading={settledQuery ? "Pages" : "Suggested pages"}
              >
                {results.map((entry) => (
                  <CommandItem
                    key={entry.url}
                    value={entry.url}
                    onSelect={handleSelect}
                  >
                    {entry.icon && <entry.icon className="size-4 shrink-0" />}
                    <span className="truncate">{entry.title}</span>
                    <span className="text-muted-foreground ml-auto text-xs">
                      {entry.section}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>

            <div className="text-muted-foreground bg-muted/50 border-t px-3 py-2 text-xs">
              Enter to open, Esc to close
            </div>
          </div>
        )}
      </Command>
    </div>
  );
});
