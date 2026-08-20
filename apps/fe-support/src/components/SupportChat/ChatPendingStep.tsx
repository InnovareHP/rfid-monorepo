import { AI_STEP_FALLBACK_LABEL, AI_STEP_LABELS } from "@dashboard/shared";
import { Spinner } from "@dashboard/ui/components/spinner";

export const ChatPendingStep = ({ step }: { step?: string }) => (
  <div className="flex items-center gap-2 text-sm leading-relaxed text-muted-foreground">
    <Spinner className="size-4" />
    <span>
      {step ? (AI_STEP_LABELS[step] ?? AI_STEP_FALLBACK_LABEL) : "Thinking..."}
    </span>
  </div>
);
