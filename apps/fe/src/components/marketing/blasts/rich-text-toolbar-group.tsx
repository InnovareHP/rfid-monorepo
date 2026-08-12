import { Button } from "@dashboard/ui/components/button";
import type { ComponentType } from "react";

type RichTextToolbarGroupProps = {
  commands: readonly {
    command: string;
    icon: ComponentType<{ className?: string }>;
    label: string;
  }[];
  disabled: boolean;
  onRun: (command: string) => void;
};

// Segmented run of execCommand buttons, joined like the Figma toggle groups.
export const RichTextToolbarGroup = ({
  commands,
  disabled,
  onRun,
}: RichTextToolbarGroupProps) => (
  <div className="flex items-center">
    {commands.map(({ command, icon: Icon, label }) => (
      <Button
        key={command}
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        aria-label={label}
        title={label}
        className="size-8 rounded-none first:rounded-l-md last:rounded-r-md"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onRun(command)}
      >
        <Icon className="size-4" />
      </Button>
    ))}
  </div>
);
