import { useState } from "react";

type Props = {
  values: string[];
  emptyMessage: string;
  limit?: number;
};

const DEFAULT_LIMIT = 8;

export function TagList({ values, emptyMessage, limit = DEFAULT_LIMIT }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (values.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  const hidden = values.length - limit;
  const visible = expanded ? values : values.slice(0, limit);

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((value) => (
        <span
          key={value}
          className="rounded-md bg-brand/5 px-2.5 py-1 text-xs font-medium text-chart-seq-2"
        >
          {value}
        </span>
      ))}

      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="rounded-md bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand/20"
        >
          {expanded ? "Show less" : `+${hidden} more`}
        </button>
      ) : null}
    </div>
  );
}
