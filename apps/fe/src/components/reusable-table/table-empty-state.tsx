// Shared by the desktop table cell and the mobile card list so both empty
// states stay identical.
export const TableEmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center gap-4">
    <div className="h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center border-2 border-primary/30">
      <svg
        className="h-10 w-10 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
    </div>
    <div className="space-y-2">
      <p className="font-semibold text-foreground text-lg">{message}</p>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Add your first entry to get started and see your data here.
      </p>
    </div>
  </div>
);
