import { ROLE_LABELS, ROLES } from "@dashboard/shared";
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
  role: z.enum([ROLES.LIAISON, ROLES.ADMIN, ROLES.ADMISSION_MANAGER]),
  message: z.string(),
});

export type InviteFormValues = z.infer<typeof formSchema>;

type InviteMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName?: string;
  onInvite: (values: InviteFormValues, reset: () => void) => Promise<void>;
};

export function InviteMemberDialog({
  open,
  onOpenChange,
  organizationName,
  onInvite,
}: InviteMemberDialogProps) {
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(formSchema),
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
        <Button className="w-full bg-brand text-white hover:bg-brand/90 sm:w-auto">
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
                      Email Address <span className="text-red-500">*</span>
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
                      Company Role <span className="text-red-500">*</span>
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
                        <SelectItem value={ROLES.ADMISSION_MANAGER}>
                          {ROLE_LABELS[ROLES.ADMISSION_MANAGER]}
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
                className="bg-brand text-white hover:bg-brand/90"
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
