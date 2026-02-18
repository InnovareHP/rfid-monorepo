import {
  formatDate,
  getInitials,
  type TicketAttachment,
} from "@dashboard/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";

export function MessageItem({
  name,
  image,
  date,
  message,
  attachments = [],
}: {
  name: string;
  image: string;
  date: string;
  message: string;
  attachments?: TicketAttachment[];
}) {
  return (
    <div className="border-b border-border last:border-b-0 px-5 py-5">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={image} />
          <AvatarFallback className="text-xs bg-muted">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">
              {name}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(date)}
            </span>
          </div>
          <div className="mt-2 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {message}
          </div>
          {attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border"
                >
                  <img
                    src={att.imageUrl}
                    alt="Attachment"
                    className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
