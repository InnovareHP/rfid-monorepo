// Shared required/optional affordances so every form marks fields the same way.
export const RequiredMark = () => (
  <span className="text-red-500" aria-hidden>
    *
  </span>
);

export const OptionalTag = () => (
  <span className="text-xs font-normal text-muted-foreground">Optional</span>
);

export const RequiredLegend = ({ className }: { className?: string }) => (
  <p className={className}>
    <RequiredMark /> marks a required field, everything else is optional.
  </p>
);
