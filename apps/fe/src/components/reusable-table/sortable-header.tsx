import { ChevronsUpDown } from "lucide-react";

export type SortDirection = "asc" | "desc";

type SortableHeaderProps = {
  label: string;
  onToggle: () => void;
};

// Column header that toggles sorting, matching the table header type scale.
export function SortableHeader({ label, onToggle }: SortableHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 font-semibold text-gray-900"
    >
      {label}
      <ChevronsUpDown className="size-3.5 text-gray-500" />
    </button>
  );
}
