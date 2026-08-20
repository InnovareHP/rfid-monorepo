import type { BlastBlockType } from "./blast-block-schema";
import { BLOCK_TYPES } from "./blast-block-types";

type BlastBlockPickerProps = {
  onAdd: (type: BlastBlockType) => void;
};

export const BlastBlockPicker = ({ onAdd }: BlastBlockPickerProps) => (
  <div className="grid grid-cols-2 gap-3">
    {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
      <button
        key={type}
        type="button"
        onClick={() => onAdd(type)}
        className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border px-3 py-6 text-sm text-foreground hover:bg-muted"
      >
        <Icon className="size-7 text-foreground" />
        <span className="text-center leading-tight">{label}</span>
      </button>
    ))}
  </div>
);
