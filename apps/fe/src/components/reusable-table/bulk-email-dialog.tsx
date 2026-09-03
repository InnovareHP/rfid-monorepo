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
import { Textarea } from "@dashboard/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { MailIcon, SendIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  getGmailStatus,
  getOutlookStatus,
  sendBulkEmail,
} from "../../services/lead/lead-service";

const emailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
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
    defaultValues: { subject: "", body: "", sendVia: "AUTO" },
  });

  const { data: gmailStatus } = useQuery({
    queryKey: ["gmail-status"],
    queryFn: getGmailStatus,
  });

  const { data: outlookStatus } = useQuery({
    queryKey: ["outlook-status"],
    queryFn: getOutlookStatus,
  });

  const recipientLabel = recordIds.length === 1 ? "recipient" : "recipients";

  const handleSendEmail = async (values: EmailValues) => {
    try {
      const result = await sendBulkEmail({
        recordIds,
        emailSubject: values.subject,
        emailBody: values.body,
        moduleType,
        send_via: values.sendVia,
      });

      const parts: string[] = [];
      if (result.sent > 0) parts.push(`Sent ${result.sent}`);
      if (result.skipped > 0) parts.push(`Skipped ${result.skipped}`);
      if (result.errors > 0) parts.push(`Failed ${result.errors}`);

      toast.success(parts.join(", "));
      setOpen(false);
      form.reset();
      onSent();
    } catch {
      toast.error("Failed to send emails. Please try again.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogContent variant="shell" className="sm:max-w-lg">
        <DialogFormHeader
          icon={<MailIcon />}
          title="Send Email"
          description={`Send an email to ${recordIds.length} selected ${recipientLabel}. Records without an email address will be skipped.`}
        />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSendEmail)}>
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
                      disabled={form.formState.isSubmitting}
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
                    <Textarea
                      placeholder="Enter email body..."
                      disabled={form.formState.isSubmitting}
                      rows={6}
                      {...field}
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
                    disabled={form.formState.isSubmitting}
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
                onClick={() => setOpen(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
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
      </DialogContent>
    </Dialog>
  );
}
