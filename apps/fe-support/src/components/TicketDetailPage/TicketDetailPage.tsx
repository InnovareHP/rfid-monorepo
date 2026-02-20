import { uploadImage } from "@/services/image/image-service";
import {
  closeTicket,
  createTicketAttachment,
  createTicketMessage,
  getSupportTicketById,
} from "@/services/support/support-service";
import {
  formatDate,
  getStatusLabel,
  statusConfig,
  TicketStatus,
  type TicketDetail,
} from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@dashboard/ui/components/tabs";
import { Textarea } from "@dashboard/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  Star,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { MessageItem } from "../Reusable/MessageItem";
import { MetaRow } from "../Reusable/MetaRow";
import { RatingDialog } from "../Reusable/RatingDialog";
import { TicketHistoryPanel } from "../Reusable/TicketHistoryPanel";

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

  const invalidateTicket = () => {
    queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
    queryClient.invalidateQueries({ queryKey: ["ticket-history", ticketId] });
  };

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!ticket) return;

      const message = await createTicketMessage(
        ticket.id,
        replyText.trim() || " "
      );

      for (const file of attachments) {
        const { url } = await uploadImage(file);
        await createTicketAttachment(ticket.id, message.id, url);
      }
    },
    onSuccess: () => {
      setReplyText("");
      setAttachments([]);
      toast.success("Reply sent");
      invalidateTicket();
    },
    onError: () => {
      toast.error("Failed to send reply");
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => closeTicket(ticket!.id),
    onSuccess: () => {
      toast.success("Ticket closed");
      invalidateTicket();
    },
    onError: () => toast.error("Failed to close ticket"),
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
  const isClosed = ticket.status === TicketStatus.CLOSED;
  const isResolved = ticket.status === TicketStatus.RESOLVED;
  const isTerminal = isClosed;
  const existingRating = ticket.SupportTicketRating;
  const canRate = isResolved && !existingRating;

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
          {/* Left: Conversation thread + history tabs */}
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="conversation">
              <TabsList className="mb-4">
                <TabsTrigger value="conversation" className="gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Conversation
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1.5">
                  <span className="h-3.5 w-3.5 text-xs">🕐</span>
                  Audit log
                </TabsTrigger>
              </TabsList>

              <TabsContent value="conversation">
                <div className="rounded-lg border border-border bg-card">
                  {/* Messages */}
                  {ticket.SupportTicketMessage.map((msg) => (
                    <MessageItem
                      key={msg.id}
                      name={msg.senderUser.user_name}
                      image={msg.senderUser.user_image}
                      date={msg.createdAt}
                      message={msg.message}
                      attachments={msg.SupportTicketAttachment}
                    />
                  ))}
                </div>

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
              </TabsContent>

              <TabsContent value="history">
                <TicketHistoryPanel ticketId={ticketId} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Ticket metadata sidebar */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-lg border border-border bg-card">
                <div className="divide-y divide-border">
                  <MetaRow
                    label="Requester"
                    value={ticket.createByUser.user_name}
                  />
                  <MetaRow label="Subject" value={ticket.subject} />
                  <MetaRow label="Category" value={ticket.category} />
                  <MetaRow
                    label="Created"
                    value={formatDate(ticket.createdAt)}
                  />
                  <MetaRow
                    label="Last activity"
                    value={formatDate(
                      ticket.SupportHistory[0]?.createdAt ?? ticket.createdAt
                    )}
                  />
                  <MetaRow
                    label="Ticket Number"
                    value={`#${ticket.ticketNumber}`}
                  />
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <Badge variant="outline" className={sConfig.className}>
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${sConfig.dot}`}
                      />
                      {getStatusLabel(ticket.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* User actions */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Actions
                </h3>

                {!isTerminal && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => closeMutation.mutate()}
                    disabled={closeMutation.isPending}
                  >
                    {closeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    Close ticket
                  </Button>
                )}

                {/* Rating — show dialog if not yet rated, read-only display if already rated */}
                {isResolved &&
                  (existingRating ? (
                    <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Your rating
                      </p>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s <= existingRating.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`}
                          />
                        ))}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {existingRating.rating}/5
                        </span>
                      </div>
                      {existingRating.comment && (
                        <p className="text-xs text-muted-foreground italic">
                          "{existingRating.comment}"
                        </p>
                      )}
                    </div>
                  ) : canRate ? (
                    <RatingDialog ticketId={ticketId} existingRating={null} />
                  ) : null)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
