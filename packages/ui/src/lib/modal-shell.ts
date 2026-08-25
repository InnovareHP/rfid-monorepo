// The shared modal shell band, held here so a Dialog form and an AlertDialog
// confirm cannot drift into looking like two different systems.
export const MODAL_SHELL_HEADER =
  "flex-row items-center gap-4 space-y-0 border-b border-border bg-table-header px-6 py-5 text-left";

export const MODAL_SHELL_ICON =
  "flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground [&_svg]:size-6";

export const MODAL_SHELL_TITLE = "text-2xl font-bold text-brand";

export const MODAL_SHELL_FOOTER =
  "flex-row items-center justify-between gap-3 border-t border-border px-6 py-4 sm:justify-between";
