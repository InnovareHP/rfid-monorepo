// The shared modal shell band, held here so a Dialog form and an AlertDialog
// confirm cannot drift into looking like two different systems. The band keeps
// its own scroll so a header-only confirm cannot push its footer off a short
// viewport.
export const MODAL_SHELL_HEADER =
  "min-h-0 flex-row items-center gap-3 space-y-0 overflow-y-auto border-b border-border bg-table-header px-4 py-4 text-left sm:gap-4 sm:px-6 sm:py-5";

export const MODAL_SHELL_ICON =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground [&_svg]:size-5 sm:size-12 sm:[&_svg]:size-6";

export const MODAL_SHELL_TITLE = "text-xl font-bold text-brand sm:text-2xl";

export const MODAL_SHELL_FOOTER =
  "shrink-0 flex-row items-center justify-between gap-3 border-t border-border px-4 py-3 sm:justify-between sm:px-6 sm:py-4";

// Shell modals are a column: the band and footer hold their height while the
// body takes what is left. A percentage cap on the body instead of this
// clipped it on a phone in landscape, where the whole modal is ~400px tall.
// Padding is owned by the default variant, not cancelled here: a p-0 cannot
// beat the base sm:p-6, since same-variant utilities sort by value.
// The [&>form] rules carry the column through an intermediate <form>: without
// them the body's flex-1 has no flex parent, so it never took the spare height
// and the footer floated up under the fields instead of sitting at the bottom.
export const MODAL_SHELL_CONTENT =
  "flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden [&>form]:flex [&>form]:min-h-0 [&>form]:flex-1 [&>form]:flex-col";

// A form modal fills the phone: same centering, viewport-sized box, so it
// lands at inset 0 without fighting the translate the centered card needs.
// Confirms keep the compact card - AlertDialog does not take this.
export const MODAL_SHELL_FULLSCREEN_MOBILE =
  "max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0 max-sm:[&_[data-slot=dialog-header]]:pt-6 max-sm:[&_[data-slot=dialog-footer]]:pb-5";

// justify-center-safe, not justify-center: safe alignment centers a short form
// in a full screen modal but falls back to the top once the fields overflow,
// so nothing scrolls out of reach above the viewport.
export const MODAL_SHELL_BODY =
  "min-h-0 flex-1 overflow-y-auto px-4 py-4 max-sm:flex max-sm:flex-col max-sm:justify-center-safe sm:px-6 sm:py-5";
