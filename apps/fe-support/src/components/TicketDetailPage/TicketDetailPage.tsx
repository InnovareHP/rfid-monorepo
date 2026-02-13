import { uploadImage } from "@/services/image/image-service";
import {
  createTicketAttachment,
  createTicketMessage,
  getSupportTicketById,
} from "@/services/support/support-service";
import { getStatusLabel, statusConfig } from "@dashboard/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Textarea } from "@dashboard/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Paperclip, Send, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type TicketMessage = {
  id: string;
  message: string;
  sender: string;
  createdAt: string;
  senderUser: {
    id: string;
    user_name: string;
    user_image: string;
  };
};

type TicketAttachment = {
  id: string;
  imageUrl: string;
  createdAt: string;
};

type TicketDetail = {
  id: string;
  ticketNumber: string;
  title: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  createBy: string;
  createByUser: {
    id: string;
    user_name: string;
    user_image: string;
  };
  assignedToUser: {
    id: string;
    user_name: string;
    user_image: string;
  };
  SupportTicketMessage: TicketMessage[];
  SupportTicketAttachment: TicketAttachment[];
};

export function TicketDetailPage({ ticketId }: { ticketId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: ticket, isLoading } = useQuery<TicketDetail>({
    queryKey: ["support-ticket", ticketId],
    queryFn: () =>
      getSupportTicketById(ticketId) as unknown as Promise<TicketDetail>,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!ticket) return;

      for (const file of attachments) {
        const { url } = await uploadImage(file);
        await createTicketAttachment(ticket.id, url);
      }

      if (replyText.trim()) {
        await createTicketMessage(ticket.id, replyText.trim());
      }
    },
    onSuccess: () => {
      setReplyText("");
      setAttachments([]);
      toast.success("Reply sent");
      queryClient.invalidateQueries({
        queryKey: ["support-ticket", ticketId],
      });
    },
    onError: () => {
      toast.error("Failed to send reply");
    },
  });

  const handleSubmit = () => {
    if (!replyText.trim() && attachments.length === 0) return;
    sendMessageMutation.mutate();
  };

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = 5 - attachments.length;
      const accepted = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, remaining);
      if (accepted.length > 0) {
        setAttachments((prev) => [...prev, ...accepted]);
      }
    },
    [attachments.length]
  );

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Ticket not found</p>
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go back
        </Button>
      </div>
    );
  }

  const sConfig = statusConfig[ticket.status] ?? statusConfig.OPEN;

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 h-8 w-8 shrink-0"
            onClick={() => navigate({ to: "/" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            {ticket.title}
          </h1>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left: Conversation thread */}
          <div className="flex-1 min-w-0">
            <div className="rounded-lg border border-border bg-card">
              <MessageItem
                name={ticket.createByUser.user_name}
                image={ticket.createByUser.user_image}
                date={ticket.createdAt}
                message={ticket.description}
              />

              {/* Messages */}
              {ticket.SupportTicketMessage.map((msg) => (
                <MessageItem
                  key={msg.id}
                  name={msg.senderUser.user_name}
                  image={msg.senderUser.user_image}
                  date={msg.createdAt}
                  message={msg.message}
                />
              ))}
            </div>

            {/* Attachments */}
            {ticket.SupportTicketAttachment.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Attachments
                </p>
                <div className="flex flex-wrap gap-2">
                  {ticket.SupportTicketAttachment.map((att) => (
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
              </div>
            )}

            {/* Reply section */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Write a reply
              </h3>
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                className="resize-none"
              />

              {/* Attachment previews */}
              {attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {attachments.map((file, i) => (
                    <div
                      key={i}
                      className="group relative h-16 w-16 overflow-hidden rounded-lg border border-border"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Attachment ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <Button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-4 w-4 text-white" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  <Paperclip className="h-4 w-4" />
                  Attach files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleFileSelect(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={
                    sendMessageMutation.isPending ||
                    (!replyText.trim() && attachments.length === 0)
                  }
                  className="gap-1.5"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send reply
                </Button>
              </div>
            </div>
          </div>

          {/* Right: Ticket metadata sidebar */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="sticky top-6 rounded-lg border border-border bg-card">
              <div className="divide-y divide-border">
                <MetaRow
                  label="Requester"
                  value={ticket.createByUser.user_name}
                />
                <MetaRow label="Subject" value={ticket.subject} />
                <MetaRow label="Category" value={ticket.category} />
                <MetaRow label="Created" value={formatDate(ticket.createdAt)} />
                <MetaRow
                  label="Last activity"
                  value={formatDate(ticket.updatedAt)}
                />
                <MetaRow
                  label="Ticket Number"
                  value={`#${ticket.ticketNumber}`}
                />
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="outline" className={sConfig.className}>
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${sConfig.dot}`}
                    />
                    {getStatusLabel(ticket.status)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageItem({
  name,
  image,
  date,
  message,
}: {
  name: string;
  image: string;
  date: string;
  message: string;
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
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right max-w-[160px] truncate">
        {value}
      </span>
    </div>
  );
}
