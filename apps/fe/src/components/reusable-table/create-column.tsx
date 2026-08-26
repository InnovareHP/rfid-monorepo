import { WriteGate } from "@/components/write-gate";
import { boardQueryKey } from "@/lib/helper/board-query-key";
import { createColumn } from "@/services/lead/lead-service";
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
import { Label } from "@dashboard/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@dashboard/ui/components/radio-group";
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlignLeft,
  Building2,
  Calendar,
  CheckSquare,
  ChevronDown,
  Hash,
  type LucideIcon,
  Mail,
  Phone,
  Plus,
  User,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// The picker deliberately omits the types a plain form cannot populate
// (STATUS, LOCATION, TIMELINE, ASSIGNED_TO, PERSON), so the schema is the
// single source of truth for what this dialog can create.
const ColumnSchema = z.object({
  name: z.string().trim().min(1, "Column name is required").max(120),
  fieldType: z.enum([
    "TEXT",
    "NUMBER",
    "EMAIL",
    "PHONE",
    "DATE",
    "CHECKBOX",
    "DROPDOWN",
    "CONTACT_LINK",
    "COMPANY_LINK",
  ]),
});

type ColumnForm = z.infer<typeof ColumnSchema>;

// Typed against the schema, so a typo here fails the build rather than the request.
const FIELD_TYPES: {
  label: string;
  value: ColumnForm["fieldType"];
  icon: LucideIcon;
}[] = [
  { label: "Text", value: "TEXT", icon: AlignLeft },
  { label: "Number", value: "NUMBER", icon: Hash },
  { label: "Email", value: "EMAIL", icon: Mail },
  { label: "Phone", value: "PHONE", icon: Phone },
  { label: "Date", value: "DATE", icon: Calendar },
  { label: "Checkbox", value: "CHECKBOX", icon: CheckSquare },
  { label: "Dropdown", value: "DROPDOWN", icon: ChevronDown },
  { label: "Contact Link", value: "CONTACT_LINK", icon: User },
  { label: "Company Link", value: "COMPANY_LINK", icon: Building2 },
];

export function CreateColumnModal({
  isReferral = false,
  moduleType,
  queryKey,
}: {
  isReferral?: boolean;
  moduleType?: string;
  queryKey?: string[];
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ColumnForm>({
    resolver: zodResolver(ColumnSchema),
    defaultValues: { name: "", fieldType: "TEXT" },
  });

  const createMutation = useMutation({
    mutationFn: (values: ColumnForm) =>
      createColumn(
        values.fieldType,
        values.name,
        moduleType ?? (isReferral ? "REFERRAL" : "LEAD")
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKey ?? boardQueryKey(isReferral ? "REFERRAL" : "LEAD"),
      });
      toast.success("Column created successfully!");
      setOpen(false);
      form.reset();
    },
    onError: () => toast.error("Error creating column"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <WriteGate>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Column
          </Button>
        </DialogTrigger>
      </WriteGate>

      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogFormHeader
          icon={<Plus />}
          title="Add a New Column"
          description="Pick a name and the type of value this column will hold."
        />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              createMutation.mutateAsync(values)
            )}
          >
            <div className="space-y-5 px-6 py-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Column Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Last Interaction"
                        disabled={createMutation.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fieldType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Column Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={createMutation.isPending}
                        className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3"
                      >
                        {FIELD_TYPES.map((fieldType) => (
                          <Label
                            key={fieldType.value}
                            htmlFor={fieldType.value}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-all hover:bg-accent",
                              field.value === fieldType.value
                                ? "border-primary bg-accent"
                                : "border-border"
                            )}
                          >
                            <RadioGroupItem
                              id={fieldType.value}
                              value={fieldType.value}
                            />
                            <fieldType.icon className="size-4" />
                            <span className="text-sm">{fieldType.label}</span>
                          </Label>
                        ))}
                      </RadioGroup>
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
                onClick={() => setOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFormFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
