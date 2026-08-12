import { Button } from "@dashboard/ui/components/button";
import { Copy, Trash2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { BlastBlock, BlastFormValues } from "./blast-block-schema";
import { BlastBlockFields } from "./blast-block-fields";
import { BLOCK_TYPES } from "./blast-block-types";
import { BlastSurfaceFields } from "./blast-surface-fields";

type BlastBlockEditorPanelProps = {
  form: UseFormReturn<BlastFormValues>;
  block: BlastBlock;
  index: number;
  onDuplicate: () => void;
  onDelete: () => void;
};

export const BlastBlockEditorPanel = ({
  form,
  block,
  index,
  onDuplicate,
  onDelete,
}: BlastBlockEditorPanelProps) => {
  const meta = BLOCK_TYPES.find((entry) => entry.type === block.type);
  const Icon = meta?.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-5 text-foreground" />}
        <h3 className="text-lg font-medium text-foreground">{meta?.label}</h3>
      </div>

      <BlastBlockFields form={form} type={block.type} index={index} />

      <BlastSurfaceFields form={form} index={index} />

      <div className="flex gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onDuplicate}
        >
          <Copy className="size-4" />
          Duplicate
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>
    </div>
  );
};
