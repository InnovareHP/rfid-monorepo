import {
  createBlast,
  type BlastEditorType,
  type MarketingBlast,
} from "@/services/marketing/blast-service";
import { getCampaigns } from "@/services/marketing/campaign-service";
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
  RadioGroup,
  RadioGroupItem,
} from "@dashboard/ui/components/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { createDefaultBlock } from "./blast-block-schema";
import { BlastGroupPicker } from "./blast-group-picker";
import { NO_CAMPAIGN } from "./blast-settings-panel";

const createBlastSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  campaignId: z.string(),
  groupIds: z.array(z.string()),
  editorType: z.enum(["DRAG_DROP", "CLASSIC"]),
});

type CreateBlastValues = z.infer<typeof createBlastSchema>;

const EDITOR_OPTIONS: { value: BlastEditorType; label: string }[] = [
  { value: "DRAG_DROP", label: "Drag and Drop Builder" },
  { value: "CLASSIC", label: "Classic Editor" },
];

type BlastCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (blast: MarketingBlast) => void;
};

export const BlastCreateDialog = ({
  open,
  onOpenChange,
  onCreated,
}: BlastCreateDialogProps) => {
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["marketing-campaigns"],
    queryFn: getCampaigns,
    enabled: open,
  });

  const form = useForm<CreateBlastValues>({
    resolver: zodResolver(createBlastSchema),
    defaultValues: {
      name: "",
      subject: "",
      campaignId: NO_CAMPAIGN,
      groupIds: [],
      editorType: "DRAG_DROP",
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateBlastValues) =>
      createBlast({
        name: values.name.trim(),
        subject: values.subject.trim(),
        campaignId:
          values.campaignId === NO_CAMPAIGN ? null : values.campaignId,
        groupIds: values.groupIds,
        editorType: values.editorType,
        // Opens on a headline and a footer rather than a blank canvas. Both
        // are ordinary blocks the author can move or delete.
        blocks:
          values.editorType === "DRAG_DROP"
            ? [createDefaultBlock("HEADLINE"), createDefaultBlock("FOOTER")]
            : undefined,
      }),
    onSuccess: (created) => {
      toast.success("Blast created");
      queryClient.invalidateQueries({ queryKey: ["marketing-blasts"] });
      onOpenChange(false);
      form.reset();
      onCreated(created);
    },
    onError: () => toast.error("Failed to create blast"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) form.reset();
      }}
    >
      <DialogContent variant="shell" className="sm:max-w-2xl">
        <DialogFormHeader
          icon={<Mail />}
          title="New Blast"
          description="Set the basics now - audience, campaign, and content can be refined after creation."
        />

        <Form {...form}>
          <DialogFormBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Internal name - recipients never see this."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="campaignId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CAMPAIGN}>None</SelectItem>
                        {campaigns.map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Subject <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Email Subject" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="groupIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Group</FormLabel>
                  <BlastGroupPicker
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="editorType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Editor</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-wrap gap-6"
                    >
                      {EDITOR_OPTIONS.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center gap-2"
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={`editor-${option.value}`}
                          />
                          <label
                            htmlFor={`editor-${option.value}`}
                            className="cursor-pointer text-sm text-foreground"
                          >
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </DialogFormBody>

          <DialogFormFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit((values) =>
                createMutation.mutate(values)
              )}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create Blast
            </Button>
          </DialogFormFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
