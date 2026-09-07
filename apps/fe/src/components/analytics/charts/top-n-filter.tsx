import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";

// Ten is the cap because every ranked card already shows ten: a larger option
// would rank the same rows it is showing.
const TOP_N_OPTIONS = [3, 5, 10];

type TopNFilterProps = {
  value: number | null;
  onChange: (topN: number) => void;
  className?: string;
};

// Trims how many groups a ranked card keeps, for this read only. Null leaves
// each card on the count its own title claims.
export function TopNFilter({ value, onChange, className }: TopNFilterProps) {
  return (
    <Select
      value={value ? String(value) : undefined}
      onValueChange={(next) => onChange(Number(next))}
    >
      <SelectTrigger size="sm" className={className ?? "w-24"}>
        <SelectValue placeholder="Top" />
      </SelectTrigger>
      <SelectContent>
        {TOP_N_OPTIONS.map((option) => (
          <SelectItem key={option} value={String(option)}>
            Top {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
