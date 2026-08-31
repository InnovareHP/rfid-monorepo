import {
  isConsumerEmailDomain,
  ROLE_LABELS,
  ROLES,
} from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormFooter,
  DialogFormHeader,
  DialogTrigger,
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
import { Textarea } from "@dashboard/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  email: z.email(),
  role: z.enum([ROLES.LIAISON, ROLES.ADMIN, ROLES.MEMBER]),
  message: z.string(),
});

// In HIPAA mode the API refuses a consumer mailbox outright. Saying so here means
// the owner reads it against the field rather than as a failed send.
const hipaaFormSchema = formSchema.refine(
  (values) => !isConsumerEmailDomain(values.email),
  { path: ["email"], message: "Use a work email address, not a personal one." }
);

export type InviteFormValues = z.infer<typeof formSchema>;

type InviteMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName?: string;
  // Set when the organization runs in HIPAA mode.
  workEmailOnly?: boolean;
  onInvite: (values: InviteFormValues, reset: () => void) => Promise<void>;
};

export function InviteMemberDialog({
  open,
  onOpenChange,
  organizationName,
  workEmailOnly = false,
  onInvite,
}: InviteMemberDialogProps) {
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(workEmailOnly ? hipaaFormSchema : formSchema),
    defaultValues: {
      email: "",
      role: ROLES.LIAISON,
      message: "",
    },
    mode: "onChange",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogFormHeader
          icon={
            <img
              src="/branding/Mascot/Refidly%20Brand%20Mascot-02%202.png"
              alt=""
              className="size-full object-contain"
            />
          }
          iconClassName="size-16 bg-transparent"
          title="Invite Team Member"
          description={`Send an invitation to join ${organizationName?.replaceAll("-", " ") ?? "the"} dashboard.`}
        />
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              onInvite(values, () => form.reset())
            )}
          >
            <div className="space-y-4 px-6 py-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email Address <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="colleague@companyemail.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Company Role <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ROLES.LIAISON}>
                          {ROLE_LABELS[ROLES.LIAISON]}
                        </SelectItem>
                        <SelectItem value={ROLES.ADMIN}>
                          {ROLE_LABELS[ROLES.ADMIN]}
                        </SelectItem>
                        <SelectItem value={ROLES.MEMBER}>
                          {ROLE_LABELS[ROLES.MEMBER]}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Welcome to our team!"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFormFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={form.formState.isSubmitting}
                type="submit"
               
              >
                <Send className="h-4 w-4" />
                {form.formState.isSubmitting ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFormFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
