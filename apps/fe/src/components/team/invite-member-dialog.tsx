import { ROLE_LABELS, ROLES } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormFooter,
  DialogFormHeader,
  DialogTrigger,
} from "@dashboard/ui/components/dialog";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
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
        <form
          onSubmit={form.handleSubmit((values) =>
            onInvite(values, () => form.reset())
          )}
        >
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@companyemail.com"
                {...form.register("email")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">
                Company Role <span className="text-red-500">*</span>
              </Label>
              <Select
                {...form.register("role")}
                onValueChange={(value) =>
                  form.setValue("role", value as InviteFormValues["role"])
                }
                defaultValue={ROLES.LIAISON}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Personal Message</Label>
              <Textarea
                id="message"
                placeholder="Welcome to our team!"
                rows={4}
                {...form.register("message")}
              />
            </div>
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
      </DialogContent>
    </Dialog>
  );
}
