import {
  hasFindings,
  type DuplicateFindings,
} from "@/lib/helper/duplicate-findings";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { AlertTriangle, Ban } from "lucide-react";

type DuplicateWarningDialogProps = {
  findings: DuplicateFindings | null;
  entityLabel: string;
  onCancel: () => void;
  onCreateAnyway: () => void;
};

const Row = ({ title, detail }: { title: string; detail?: string }) => (
  <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
    <p className="font-semibold text-foreground">{title}</p>
    {detail ? <p className="text-muted-foreground">{detail}</p> : null}
  </div>
);

export function DuplicateWarningDialog({
  findings,
  entityLabel,
  onCancel,
  onCreateAnyway,
}: DuplicateWarningDialogProps) {
  const open = findings !== null && hasFindings(findings);
  // The server refuses both an exact name and one that is merely similar, so
  // neither can be overridden here. Only an email or phone collision leaves
  // the choice to the user.
  const blocked = Boolean(findings?.exactMatch || findings?.nearMatches.length);
  const label = entityLabel.toLowerCase();

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onCancel())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {blocked ? (
              <Ban className="h-5 w-5 text-destructive" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-warning" />
            )}
            {blocked
              ? `That ${label} already exists`
              : `Possible duplicate ${label}`}
          </DialogTitle>
          <DialogDescription>
            {blocked
              ? "A record with this name is already on this module. Use the existing one, or rename it first."
              : "These look like the same record. You can still create it if that is intentional."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-48 space-y-2 overflow-y-auto">
          {findings?.exactMatch ? (
            <Row
              title={findings.exactMatch.recordName}
              detail="Same name, already on this module"
            />
          ) : null}

          {findings?.nearMatches.map((match) => (
            <Row
              key={match.recordId}
              title={match.recordName}
              detail="Too similar to this name"
            />
          ))}

          {findings?.duplicates.map((duplicate) => (
            <Row
              key={`${duplicate.recordId}-${duplicate.matchedField}`}
              title={duplicate.recordName}
              detail={`${duplicate.matchedField}: ${duplicate.matchedValue}`}
            />
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Go back and edit
          </Button>
          {blocked ? null : (
            <Button onClick={onCreateAnyway}>Create anyway</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
