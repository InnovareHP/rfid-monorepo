import { uploadImage } from "@/services/image/image-service";
import {
  createTicketAttachment,
  createTicketMessage,
  deleteSupportTicket,
  getSupportTicketById,
  updateSupportTicket,
} from "@/services/support/support-service";
import {
  formatCapitalize,
  formatDate,
  getStatusLabel,
  Priority,
  priorityConfig,
  statusConfig,
  TicketCategory,
  TicketStatus,
  type TicketDetail,
} from "@dashboard/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@dashboard/ui/components/alert-dialog";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Separator } from "@dashboard/ui/components/separator";
import { Textarea } from "@dashboard/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Paperclip, Send, Trash2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { MessageItem } from "../Reusable/MessageItem";
import { MetaRow } from "../Reusable/MetaRow";

export function SupportDashboardTicketDetail({
  ticketId,
}: {
  ticketId: string;
}) {
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
    queryClient.invalidateQueries({ queryKey: ["support-dashboard-tickets"] });
  };

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateSupportTicket>[1]) =>
      updateSupportTicket(ticket!.id, data),
    onSuccess: () => {
      toast.success("Ticket updated");
      invalidateTicket();
    },
    onError: () => toast.error("Failed to update ticket"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSupportTicket(ticket!.id),
    onSuccess: () => {
      toast.success("Ticket deleted");
      queryClient.invalidateQueries({
        queryKey: ["support-dashboard-tickets"],
      });
      navigate({ to: "/support/tickets" as any });
    },
    onError: () => toast.error("Failed to delete ticket"),
  });

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

  const handleBack = () => {
    navigate({ to: "/support/tickets" as any });
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
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 h-8 w-8 shrink-0"
            onClick={handleBack}
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

          {/* Right: Ticket metadata sidebar with admin controls */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="sticky top-6 space-y-4">
              {/* Info card */}
              <div className="rounded-lg border border-border bg-card">
                <div className="divide-y divide-border">
                  <MetaRow
                    label="Requester"
                    value={ticket.createByUser.user_name}
                  />
                  <MetaRow label="Subject" value={ticket.subject} />
                  <MetaRow
                    label="Created"
                    value={formatDate(ticket.createdAt)}
                  />
                  <MetaRow
                    label="Last activity"
                    value={formatDate(ticket.SupportHistory[0].createdAt)}
                  />
                  <MetaRow
                    label="Ticket Number"
                    value={`#${ticket.ticketNumber}`}
                  />
                </div>
              </div>

              {/* Admin actions card */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Manage Ticket
                </h3>

                {/* Status select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Status
                  </label>
                  <Select
                    value={ticket.status}
                    onValueChange={(value) =>
                      updateMutation.mutate({ status: value as TicketStatus })
                    }
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TicketStatus).map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center gap-2">
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${statusConfig[s]?.dot ?? "bg-gray-400"}`}
                            />
                            {getStatusLabel(s)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Priority
                  </label>
                  <Select
                    value={ticket.priority}
                    onValueChange={(value) =>
                      updateMutation.mutate({ priority: value })
                    }
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Priority).map((p) => {
                        const config = priorityConfig[p] ?? priorityConfig.LOW;
                        return (
                          <SelectItem key={p} value={p}>
                            <Badge
                              variant="outline"
                              className={config.className}
                            >
                              {formatCapitalize(p.toLowerCase())}
                            </Badge>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Category
                  </label>
                  <Select
                    value={ticket.category}
                    onValueChange={(value) =>
                      updateMutation.mutate({ category: value })
                    }
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TicketCategory).map((c) => (
                        <SelectItem key={c} value={c}>
                          {formatCapitalize(c.toLowerCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Delete */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete ticket
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete ticket{" "}
                        <strong>#{ticket.ticketNumber}</strong>. This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
