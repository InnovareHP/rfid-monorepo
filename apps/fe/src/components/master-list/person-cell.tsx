import {
  getleadValueId,
  updateContactValues,
} from "@/services/lead/lead-service";
import { formatPhoneNumber } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useIsFetching,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Loader2, Mail, Phone, Save, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const contactSchema = z.object({
  name: z.string(),
  contactNumber: z.string(),
  email: z.email("Invalid email").or(z.literal("")),
  address: z.string(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface Props {
  entityId: string;
  initialValue: string;
  fieldName: string;
  onNameChange?: (name: string) => void;
}

export const ContactTooltipForm = ({
  entityId,
  initialValue,
  fieldName,
  onNameChange,
}: Props) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: initialValue || "",
      contactNumber: "",
      email: "",
      address: "",
    },
  });

  const handleOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && initialValue?.trim()) {
      queryClient.prefetchQuery({
        queryKey: ["contact-details", entityId, initialValue],
        queryFn: () => getleadValueId(entityId, initialValue),
        staleTime: 1000 * 60 * 5,
      });
    }
    if (!nextOpen) {
      form.reset({
        name: initialValue || "",
        contactNumber: prefetchedData?.contactNumber || "",
        email: prefetchedData?.email || "",
        address: prefetchedData?.address || "",
      });
    }
  };

  const isFetching = useIsFetching({
    queryKey: ["contact-details", entityId, initialValue],
  });

  const prefetchedData = queryClient.getQueryData<{
    contactNumber: string;
    email: string;
    address: string;
  }>(["contact-details", entityId, initialValue]);

  useEffect(() => {
    form.reset({
      name: initialValue || "",
      contactNumber: prefetchedData?.contactNumber || "",
      email: prefetchedData?.email || "",
      address: prefetchedData?.address || "",
    });
  }, [prefetchedData, initialValue, form.reset]);

  const updateMutation = useMutation({
    mutationFn: (values: ContactFormValues) =>
      updateContactValues(entityId, {
        contactNumber: values.contactNumber,
        email: values.email,
        address: values.address,
        value: initialValue,
      }),
    onSuccess: () => {
      toast.success("Saved");
      queryClient.invalidateQueries({
        queryKey: ["contact-details", entityId, initialValue],
      });
    },
  });

  const handleSubmit = (values: ContactFormValues) => {
    const nameChanged = values.name.trim() !== (initialValue || "");
    const detailsChanged =
      form.formState.dirtyFields.contactNumber ||
      form.formState.dirtyFields.email ||
      form.formState.dirtyFields.address;

    // Contact details are keyed by the current name, so save them first
    if (detailsChanged && initialValue) {
      updateMutation.mutate(values);
    }
    if (nameChanged && onNameChange) {
      onNameChange(values.name.trim());
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-sm text-left cursor-pointer hover:underline transition-colors",
            initialValue ? "text-foreground" : "text-muted-foreground italic"
          )}
        >
          {initialValue || "Add person"}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        className="w-72 p-0 bg-popover text-popover-foreground border border-border rounded-lg shadow-md overflow-hidden"
      >
        <div className="px-3 py-2 border-b border-border flex justify-between items-center">
          <span className="text-xs font-semibold text-foreground">
            Edit {fieldName}
          </span>
          {isFetching > 0 && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="p-3">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-3"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Name
                    </Label>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          {...field}
                          autoFocus
                          className="h-8 pl-8 text-xs"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Phone
                    </Label>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          {...field}
                          disabled={!initialValue}
                          onChange={(e) =>
                            field.onChange(
                              formatPhoneNumber(e.target.value) ||
                                e.target.value
                            )
                          }
                          className="h-8 pl-8 text-xs"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Email
                    </Label>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          {...field}
                          disabled={!initialValue}
                          className="h-8 pl-8 text-xs"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              {!initialValue && (
                <p className="text-[11px] text-muted-foreground">
                  Save the name first, then reopen to add phone and email.
                </p>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={updateMutation.isPending || !form.formState.isDirty}
                className="w-full"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-2" />
                )}
                Save Changes
              </Button>
            </form>
          </Form>
        </div>
      </PopoverContent>
    </Popover>
  );
};
