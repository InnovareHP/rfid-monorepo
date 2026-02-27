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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@dashboard/ui/components/tooltip";
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useIsFetching,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Loader2, Mail, Phone, Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const contactSchema = z.object({
  contactNumber: z.string().min(1, "Phone is required"),
  email: z.email("Invalid email").or(z.literal("")),
  address: z.string(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface Props {
  entityId: string;
  initialValue: string;
  fieldName: string;
}

export const ContactTooltipForm = ({
  entityId,
  initialValue,
  fieldName,
}: Props) => {
  const queryClient = useQueryClient();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { contactNumber: "", email: "", address: "" },
  });

  const handlePrefetch = () => {
    if (!initialValue?.trim()) return;
    queryClient.prefetchQuery({
      queryKey: ["contact-details", entityId],
      queryFn: () => getleadValueId(entityId, initialValue),
      staleTime: 1000 * 60 * 5,
    });
  };

  const isFetching = useIsFetching({ queryKey: ["contact-details", entityId] });

  const prefetchedData = queryClient.getQueryData<{
    contactNumber: string;
    email: string;
    address: string;
  }>(["contact-details", entityId]);

  useEffect(() => {
    if (prefetchedData) {
      form.reset({
        contactNumber: prefetchedData.contactNumber || "",
        email: prefetchedData.email || "",
        address: prefetchedData.address || "",
      });
    }
  }, [prefetchedData, form.reset]);

  const updateMutation = useMutation({
    mutationFn: (values: ContactFormValues) =>
      updateContactValues(entityId, { ...values, value: initialValue }),
    onSuccess: () => {
      toast.success("Saved");
      queryClient.invalidateQueries({
        queryKey: ["contact-details", entityId],
      });
    },
  });

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            onMouseEnter={handlePrefetch}
            className={cn(
              "text-sm cursor-pointer hover:underline transition-colors",
              initialValue ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {initialValue || <span className="text-muted-foreground">—</span>}
          </span>
        </TooltipTrigger>

        {initialValue && (
          <TooltipContent
            side="top"
            className="w-72 p-0 bg-popover text-popover-foreground border border-border rounded-lg shadow-md overflow-hidden"
            onPointerDownOutside={(e) => {
              if (form.formState.isDirty) e.preventDefault();
            }}
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
                  onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))}
                  className="space-y-3"
                >
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
                              autoFocus
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
                            <Input {...field} className="h-8 pl-8 text-xs" />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      updateMutation.isPending || !form.formState.isDirty
                    }
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
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
