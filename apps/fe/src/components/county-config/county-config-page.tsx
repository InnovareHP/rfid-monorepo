import {
  createCounty,
  deleteCounty,
  getCounties,
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const CountySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "County name is required"),
  assigned_to: z.string().optional(),
});

export type CountyFormType = z.infer<typeof CountySchema>;

export default function CountyConfigTablePage() {
  const queryClient = useQueryClient();

  const { data: counties } = useQuery({
    queryKey: ["counties"],
    queryFn: getCounties,
  });

  const createCountyMutation = useMutation({
    mutationFn: createCounty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counties"] });
      queryClient.invalidateQueries({ queryKey: ["dropdown-options"] });
      toast.success("County added successfully!");
      form.reset({ id: uuidv4(), name: "", assigned_to: "" });
    },
    onError: () => {
      toast.error("Failed to add county");
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
    defaultValues: { id: uuidv4(), name: "", assigned_to: "" },
  });

  const onSubmit = (values: CountyFormType) => {
    createCountyMutation.mutate(values as CountyRow);
  };

  const handleDelete = (id: string) => {
    deleteCountyMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            County Configuration
          </h1>
          <p className="text-gray-600 mt-1">
            Manage county assignments and responsible personnel
          </p>
        </div>
        <Badge variant="outline" className="text-lg py-2 px-4">
          {counties?.filter((c: CountyRow) => c.assigned_to)?.length ?? 0}/
          {counties?.length ?? 0} Assigned
        </Badge>
      </div>

      <Card className="p-6 border border-gray-200">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col md:flex-row gap-4 items-center"
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
              name="assigned_to"
              render={({ field }) => (
                <FormItem className="w-full md:w-1/3">
                  <FormControl>
                    <Input placeholder="Assigned To" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={createCountyMutation.isPending}
              className="mt-2 md:mt-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              {createCountyMutation.isPending ? "Saving..." : "Add County"}
            </Button>
          </form>
        </Form>
      </Card>

      <Card className="overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-gray-100 border-b border-gray-200 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">
                  County Name
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  Assigned Person
                </th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {counties && counties.length > 0 ? (
                counties.map((county: CountyRow) => (
                  <tr
                    key={county.id}
                    className={`border-b ${
                      !county.assigned_to ? "bg-orange-50" : "bg-white"
                    } hover:bg-gray-50 transition-colors`}
                  >
                    <td className="px-4 py-3">{county.name}</td>
                    <td className="px-4 py-3">{county.assigned_to || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {county.assigned_to ? (
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
