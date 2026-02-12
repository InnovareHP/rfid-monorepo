import LocationCell from "@/components/reusable-table/location-cell";
import { useTeamLayoutContext } from "@/routes/_team";
import {
  createReferral,
  getReferralColumnOptions,
  getReferralDropdownOptions,
} from "@/services/referral/referral-service";
import { Button } from "@dashboard/ui/components/button";
import { Calendar } from "@dashboard/ui/components/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Checkbox } from "@dashboard/ui/components/checkbox";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_team/$team/referral-list/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const { activeOrganizationId } = useTeamLayoutContext() as {
    activeOrganizationId: string;
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch available columns from API
  const { data: columnsData, isLoading: isLoadingColumns } = useQuery({
    queryKey: ["referral-columns"],
    queryFn: getReferralColumnOptions,
  });

  const columns: { id: string; name: string; type: string }[] =
    columnsData || [];

  // Create dynamic Zod schema based on columns
  const createReferralSchema = () => {
    const fieldSchemas: Record<string, z.ZodTypeAny> = {
      referral_name: z.string().min(1, "Referral name is required"),
    };

    columns.forEach((col) => {
      switch (col.type) {
        case "TEXT":
        case "DROPDOWN":
        case "LOCATION":
        case "ASSIGNED_TO":
          fieldSchemas[col.name] = z.string().optional();
          break;
        case "DATE":
          fieldSchemas[col.name] = z.string().optional();
          break;
        case "CHECKBOX":
          fieldSchemas[col.name] = z.boolean().optional();
          break;
        default:
          fieldSchemas[col.name] = z.string().optional();
      }
    });

    return z.object({
      referrals: z
        .array(z.object(fieldSchemas))
        .min(1, "At least one referral is required"),
    });
  };

  const formSchema = createReferralSchema();
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      referrals: [
        {
          referral_name: "",
          ...columns.reduce((acc: Record<string, any>, col) => {
            acc[col.name] = col.type === "CHECKBOX" ? false : "";
            return acc;
          }, {}),
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "referrals",
  });

  // Mutation for creating referrals
  const createReferralMutation = useMutation({
    mutationFn: createReferral,
    onSuccess: () => {
      toast.success("Referrals created successfully");
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      navigate({
        to: "/$team/referral-list",
        params: { team: activeOrganizationId },
      });
    },
    onError: () => {
      toast.error("Failed to create referrals");
    },
  });

  const onSubmit = (values: FormValues) => {
    // Transform the data to match API expectations
    const referralData = values.referrals.map((referral) => {
      const transformedReferral: Record<string, any> = {
        referral_name: referral.referral_name,
      };

      columns.forEach((col) => {
        const value = referral[col.name as keyof typeof referral];

        if (col.type === "CHECKBOX") {
          transformedReferral[col.name] = value ? "true" : "false";
        } else if (col.type === "DATE" && value) {
          transformedReferral[col.name] = value;
        } else {
          transformedReferral[col.name] = value || "";
        }
      });

      return transformedReferral;
    });

    createReferralMutation.mutate(referralData);
  };

  const addNewReferral = () => {
    const newReferral = {
      referral_name: "",
      ...columns.reduce((acc: Record<string, any>, col) => {
        acc[col.name] = col.type === "CHECKBOX" ? false : "";
        return acc;
      }, {}),
    };
    append(newReferral);
  };

  if (isLoadingColumns) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                navigate({
                  to: "/$team/referral-list",
                  params: { team: activeOrganizationId },
                })
              }
              className="border-gray-300 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Create Referrals
              </h1>
              <p className="text-gray-500 mt-1">
                Add one or multiple referrals to your list
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {fields.map((field, index) => (
              <Card key={field.id} className="border shadow-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Referral #{index + 1}
                    </CardTitle>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Required Referral Name Field */}
                    <FormField
                      control={form.control}
                      name={`referrals.${index}.referral_name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-700">
                            Referral Name{" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value as string}
                              placeholder="Enter referral name"
                              className="h-11 border-2 border-gray-200 focus:border-blue-500 rounded-lg transition-colors font-medium"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Non-Checkbox Fields in 2x2 Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {columns
                        .filter(
                          (column) =>
                            column.type !== "CHECKBOX" &&
                            column.name !== "county"
                        )
                        .map((column) => (
                          <ReferralField
                            key={column.id}
                            column={column}
                            index={index}
                            form={form}
                          />
                        ))}
                    </div>

                    {/* Checkbox Fields Full Width */}
                    {columns.filter((column) => column.type === "CHECKBOX")
                      .length > 0 && (
                      <div className="space-y-3">
                        {columns
                          .filter((column) => column.type === "CHECKBOX")
                          .map((column) => (
                            <ReferralField
                              key={column.id}
                              column={column}
                              index={index}
                              form={form}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={addNewReferral}
                className="flex items-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4" />
                Add Another Referral
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate({
                      to: "/$team/referral-list",
                      params: { team: activeOrganizationId },
                    })
                  }
                  className="border-gray-300 hover:bg-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createReferralMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm min-w-[120px]"
                >
                  {createReferralMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    "Create Referrals"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

// Component for rendering individual fields based on column type
function ReferralField({
  column,
  index,
  form,
}: {
  column: { id: string; name: string; type: string };
  index: number;
  form: any;
}) {
  const fieldName = `referrals.${index}.${column.name}` as const;

  // Fetch dropdown options if needed
  const { data: dropdownOptions } = useQuery({
    queryKey: ["referral-dropdown-options", column.id],
    queryFn: () => getReferralDropdownOptions(column.id),
    enabled: column.type === "DROPDOWN" || column.type === "ASSIGNED_TO",
  });

  switch (column.type) {
    case "TEXT":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">
                {column.name}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={`Enter ${column.name.toLowerCase()}`}
                  className="border-2 border-gray-200 focus:border-blue-500 rounded-lg transition-colors"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "DATE":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">
                {column.name}
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-2 border-gray-200 hover:border-blue-500 transition-colors",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                      {field.value ? (
                        format(new Date(field.value), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => {
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "DROPDOWN":
    case "ASSIGNED_TO":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel className="text-sm font-semibold text-gray-700 mb-2">
                {column.name}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-lg transition-colors">
                    <SelectValue
                      placeholder={`Select ${column.name.toLowerCase()}`}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="w-full">
                  {dropdownOptions?.map((option: any) => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "CHECKBOX":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border-2 border-gray-200 p-4 hover:border-blue-500 transition-colors">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-semibold text-gray-700 cursor-pointer">
                  {column.name}
                </FormLabel>
              </div>
            </FormItem>
          )}
        />
      );

    case "LOCATION":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">
                {column.name}
              </FormLabel>
              <FormControl>
                <LocationCell value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    default:
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">
                {column.name}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={`Enter ${column.name.toLowerCase()}`}
                  className="border-2 border-gray-200 focus:border-blue-500 rounded-lg transition-colors"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
  }
}
