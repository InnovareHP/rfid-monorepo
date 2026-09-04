// Marks a record carrying changes nobody has opened yet.
//
// The slot is rendered whether or not the record is unread, so the name beside
// it starts on the same left edge down the whole column. It is deliberately
// static: this is a persistent state, not an event, and one animation per
// flagged row turns a busy table into a wall of movement.
export const UnreadDot = ({ unread }: { unread: boolean }) => (
  <span className="flex w-2 shrink-0 items-center justify-center">
    {unread && (
      <>
        <span className="size-1.5 rounded-full bg-primary" />
        <span className="sr-only">Unread changes</span>
      </>
    )}
  </span>
);
