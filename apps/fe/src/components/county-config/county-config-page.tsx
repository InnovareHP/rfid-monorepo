import { getLiaisons } from "@/services/options/options-service";
import {
  createCounty,
  deleteCounty,
  getCounties,
  updateCountyLiaisons,
} from "@/services/referral/referral-service";
import type { CountyRow } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Card } from "@dashboard/ui/components/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { MultiSelect } from "@dashboard/ui/components/multi-select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const CountySchema = z.object({
  name: z.string().min(1, "County name is required"),
  liaisons: z.array(z.string()).min(1, "At least one liaison is required"),
});

export type CountyFormType = z.infer<typeof CountySchema>;

export default function CountyConfigTablePage() {
  const queryClient = useQueryClient();

  const { data: counties } = useQuery<CountyRow[]>({
    queryKey: ["counties"],
    queryFn: getCounties,
  });

  const { data: liaisons } = useQuery({
    queryKey: ["liaisons"],
    queryFn: () => getLiaisons(true),
  });

  const liaisonOptions =
    liaisons?.map((l) => ({ label: l.value, value: l.value })) ?? [];

  const createCountyMutation = useMutation({
    mutationFn: createCounty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counties"] });
      queryClient.invalidateQueries({ queryKey: ["dropdown-options"] });
      toast.success("County added successfully!");
      form.reset({ name: "", liaisons: [] });
    },
    onError: () => {
      toast.error("Failed to add county");
    },
  });

  const updateLiaisonsMutation = useMutation({
    mutationFn: ({
      countyId,
      liaisons,
    }: {
      countyId: string;
      liaisons: string[];
    }) => updateCountyLiaisons(countyId, liaisons),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counties"] });
      toast.success("Liaisons updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update liaisons");
    },
  });

  const deleteCountyMutation = useMutation({
    mutationFn: deleteCounty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counties"] });
      toast.success("County deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete county");
    },
  });

  const form = useForm<CountyFormType>({
    resolver: zodResolver(CountySchema),
    defaultValues: { name: "", liaisons: [] },
  });

  const onSubmit = (values: CountyFormType) => {
    createCountyMutation.mutate(values);
  };

  const handleDelete = (id: string) => {
    deleteCountyMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold page-title">
            County Configuration
          </h1>
          <p className="text-gray-600 mt-1">
            Manage county assignments and responsible liaisons
          </p>
        </div>
        <Badge variant="outline" className="text-lg py-2 px-4">
          {counties?.filter((c) => c.liaisons.length > 0)?.length ?? 0}/
          {counties?.length ?? 0} Assigned
        </Badge>
      </div>

      <Card className="p-6 border border-gray-200">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col md:flex-row gap-4 items-start"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input placeholder="County Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="liaisons"
              render={({ field }) => (
                <FormItem className="w-full md:w-1/2">
                  <FormControl>
                    <MultiSelect
                      options={liaisonOptions}
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select liaisons"
                      hideSelectAll
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={createCountyMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              {createCountyMutation.isPending ? "Saving..." : "Add County"}
            </Button>
          </form>
        </Form>
      </Card>

      <Card className="overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  County Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Liaisons
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {counties && counties.length > 0 ? (
                counties.map((county) => (
                  <tr
                    key={county.id}
                    className={`border-b border-gray-200 ${
                      county.liaisons.length === 0 ? "bg-orange-50" : "bg-white"
                    } hover:bg-gray-50 transition-colors`}
                  >
                    <td className="px-4 py-3">{county.name}</td>
                    <td className="px-4 py-3 min-w-[280px]">
                      <MultiSelect
                        options={liaisonOptions}
                        defaultValue={county.liaisons}
                        onValueChange={(liaisons) =>
                          updateLiaisonsMutation.mutate({
                            countyId: county.id,
                            liaisons,
                          })
                        }
                        placeholder="Select liaisons"
                        hideSelectAll
                        disabled={updateLiaisonsMutation.isPending}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {county.liaisons.length > 0 ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          Assigned
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-orange-50 text-orange-700 border-orange-300"
                        >
                          Unassigned
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(county.id)}
                        className="text-gray-400 hover:text-red-500"
                        disabled={deleteCountyMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-10 text-gray-500 text-sm"
                  >
                    No counties configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
