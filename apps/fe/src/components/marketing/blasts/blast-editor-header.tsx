import { StatusPill } from "@/components/reusable-table/status-pill";
import type { MarketingBlast } from "@/services/marketing/blast-service";
import { Button } from "@dashboard/ui/components/button";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { BLAST_STATUS_LABELS, BLAST_STATUS_TONES } from "./blast-list-table";

type BlastEditorHeaderProps = {
  blast: MarketingBlast;
  title: string;
  isDraft: boolean;
  isSaving: boolean;
  onBack: () => void;
  onSave: () => void;
  onPreview: () => void;
};

export const BlastEditorHeader = ({
  blast,
  title,
  isDraft,
  isSaving,
  onBack,
  onSave,
  onPreview,
}: BlastEditorHeaderProps) => (
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        aria-label="Back to blasts"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
      </Button>
      <h1 className="page-title text-3xl font-bold tracking-tight">{title}</h1>
      <StatusPill
        label={BLAST_STATUS_LABELS[blast.status]}
        tone={BLAST_STATUS_TONES[blast.status]}
      />
    </div>

    {isDraft && (
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onSave} disabled={isSaving}>
          {isSaving && <Loader2 className="size-4 animate-spin" />}
          Save Draft
        </Button>
        <Button onClick={onPreview}>
          <Send className="size-4" />
          Preview and Send
        </Button>
      </div>
    )}
  </div>
);
