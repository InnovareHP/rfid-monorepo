import { RichTextEditor } from "@/components/marketing/blasts/rich-text-editor";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormBody,
  DialogFormFooter,
  DialogFormHeader,
} from "@dashboard/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Spinner } from "@dashboard/ui/components/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { getBulkEmailJobStatus } from "@/services/board/board-module-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MailIcon, SendIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  getGmailStatus,
  getOutlookStatus,
  sendBulkEmail,
} from "../../services/lead/lead-service";
import { BulkEmailProgress, isJobDone } from "./bulk-email-progress";
import {
  EmailAttachmentsField,
  emailAttachmentsSchema,
} from "./email-attachments-field";

const emailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  attachments: emailAttachmentsSchema,
  sendVia: z.enum(["AUTO", "GMAIL", "OUTLOOK"]),
});

type EmailValues = z.infer<typeof emailSchema>;

type BulkEmailDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  recordIds: string[];
  moduleType: string;
  onSent: () => void;
};

export function BulkEmailDialog({
  open,
  setOpen,
  recordIds,
  moduleType,
  onSent,
}: BulkEmailDialogProps) {
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { subject: "", body: "", attachments: [], sendVia: "AUTO" },
  });

  const { data: gmailStatus } = useQuery({
    queryKey: ["gmail-status"],
    queryFn: getGmailStatus,
  });

  const { data: outlookStatus } = useQuery({
    queryKey: ["outlook-status"],
    queryFn: getOutlookStatus,
  });

  const queryClient = useQueryClient();
  const recipientLabel = recordIds.length === 1 ? "recipient" : "recipients";

  const send = useMutation({
    mutationFn: (values: EmailValues) =>
      sendBulkEmail({
        recordIds,
        emailSubject: values.subject,
        emailBody: values.body,
        attachments: values.attachments,
        moduleType,
        send_via: values.sendVia,
      }),
    onError: () => toast.error("Failed to send emails. Please try again."),
  });

  const jobId = send.data?.jobId;
  const { data: job } = useQuery({
    queryKey: ["bulk-email-job", jobId],
    queryFn: () => getBulkEmailJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => (isJobDone(query.state.data) ? false : 1000),
  });

  // Selection clears only once the dialog closes so the count stays readable.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) return;
    if (jobId) {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["sent-emails"] });
      onSent();
    }
    form.reset();
    send.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent variant="shell" className="sm:max-w-2xl">
        <DialogFormHeader
          icon={<MailIcon />}
          title="Send Email"
          description={`Send an email to ${recordIds.length} selected ${recipientLabel}. Records without an email address will be skipped.`}
        />
        {jobId ? (
          <>
            <DialogFormBody>
              <BulkEmailProgress job={job} total={recordIds.length} />
            </DialogFormBody>
            <DialogFormFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                {isJobDone(job) ? "Done" : "Close and keep sending"}
              </Button>
            </DialogFormFooter>
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => send.mutate(values))}>
              <DialogFormBody className="space-y-4">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter email subject..."
                          disabled={send.isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          value={field.value}
                          onChange={field.onChange}
                          variant="full"
                          allowImages
                          disabled={send.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attachments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attachments</FormLabel>
                      <FormControl>
                        <EmailAttachmentsField
                          value={field.value}
                          onChange={field.onChange}
                          disabled={send.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sendVia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Send via</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={send.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Send via" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AUTO">Auto-detect</SelectItem>
                          {gmailStatus?.connected && (
                            <SelectItem value="GMAIL">
                              Gmail ({gmailStatus.email})
                            </SelectItem>
                          )}
                          {outlookStatus?.connected && (
                            <SelectItem value="OUTLOOK">
                              Outlook ({outlookStatus.email})
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </DialogFormBody>

              <DialogFormFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={send.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={send.isPending}>
                  {send.isPending ? (
                    <>
                      <Spinner size="sm" className="mr-2 text-current" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <SendIcon className="mr-2 size-4" />
                      Send to {recordIds.length} {recipientLabel}
                    </>
                  )}
                </Button>
              </DialogFormFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
