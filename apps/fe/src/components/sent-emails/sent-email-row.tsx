import { moduleLabel } from "@/lib/helper/module-route";
import type { SentEmail } from "@/services/email/email-service";
import { formatDateTime } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { TableCell, TableRow } from "@dashboard/ui/components/table";
import { memo } from "react";

export const SentEmailRow = memo(function SentEmailRow({
  email,
}: {
  email: SentEmail;
}) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {formatDateTime(email.emailSentAt)}
      </TableCell>
      <TableCell>
        <div className="font-medium text-foreground">{email.recordName}</div>
        <div className="text-xs text-muted-foreground">
          {moduleLabel(email.moduleType)} · {email.recipientEmail}
        </div>
      </TableCell>
      <TableCell className="max-w-xs truncate">{email.emailSubject}</TableCell>
      <TableCell>
        <div className="text-foreground">{email.sentBy}</div>
        <div className="text-xs text-muted-foreground">{email.senderEmail}</div>
      </TableCell>
      <TableCell>
        {email.openCount > 0 ? (
          <Badge variant="success">Opened {email.openCount}x</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Not opened</span>
        )}
      </TableCell>
    </TableRow>
  );
});
