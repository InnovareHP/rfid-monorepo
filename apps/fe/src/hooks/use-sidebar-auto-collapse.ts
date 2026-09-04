import * as React from "react";

// Under this width the 64px rail plus an open sidebar leaves too little room
// for the page itself, so the sidebar drops to its icon state.
const COMPACT_QUERY = "(max-width: 1279px)";

// A test environment defines the window without the method, so both are checked.
const matchCompact = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(COMPACT_QUERY)
    : null;

// Sidebar follows the viewport: icon state below the compact width, expanded
// above it. A manual toggle holds until the viewport crosses back over.
export function useSidebarAutoCollapse() {
  const [isCompact, setIsCompact] = React.useState(
    () => matchCompact()?.matches ?? false
  );
  const [manualOpen, setManualOpen] = React.useState<boolean | null>(null);
  const [lastCompact, setLastCompact] = React.useState(isCompact);

  React.useEffect(() => {
    const query = matchCompact();
    if (!query) return;

    const onChange = () => setIsCompact(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Crossing the line drops a stale manual choice rather than fighting it.
  if (lastCompact !== isCompact) {
    setLastCompact(isCompact);
    setManualOpen(null);
  }

  return { open: manualOpen ?? !isCompact, setOpen: setManualOpen };
}
