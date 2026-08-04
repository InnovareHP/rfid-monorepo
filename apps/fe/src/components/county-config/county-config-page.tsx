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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { KpiStatTile } from "../analytics/charts/kpi-stat-tile";
import { ReusableTable } from "../reusable-table/generic-table";
import {
  CountyFormDialog,
  type CountyFormType,
} from "./county-form-dialog";

const COUNTIES_KEY = ["counties"];

export default function CountyConfigTablePage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCounty, setEditingCounty] = useState<CountyRow | null>(null);

  const { data: counties, isLoading } = useQuery<CountyRow[]>({
    queryKey: COUNTIES_KEY,
    queryFn: getCounties,
  });

  const { data: liaisons } = useQuery({
    queryKey: ["liaisons"],
    queryFn: () => getLiaisons(true),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCounty(null);
  };

  const createCountyMutation = useMutation({
    mutationFn: createCounty,
    // Show the row immediately; the refetch below reconciles the real id.
    onMutate: async (payload: CountyFormType) => {
      closeDialog();
      await queryClient.cancelQueries({ queryKey: COUNTIES_KEY });
      const previous = queryClient.getQueryData<CountyRow[]>(COUNTIES_KEY);

      queryClient.setQueryData<CountyRow[]>(COUNTIES_KEY, (current = []) => [
        ...current,
        {
          id: `optimistic-${Date.now()}`,
          name: payload.name,
          liaisons: payload.liaisons,
        },
      ]);

      return { previous };
    },
    onError: (_error, _payload, context) => {
      queryClient.setQueryData(COUNTIES_KEY, context?.previous);
      toast.error("Failed to add county");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dropdown-options"] });
      toast.success("County added successfully!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: COUNTIES_KEY });
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
    onMutate: async ({ countyId, liaisons }) => {
      closeDialog();
      await queryClient.cancelQueries({ queryKey: COUNTIES_KEY });
      const previous = queryClient.getQueryData<CountyRow[]>(COUNTIES_KEY);

      queryClient.setQueryData<CountyRow[]>(COUNTIES_KEY, (current = []) =>
        current.map((county) =>
          county.id === countyId ? { ...county, liaisons } : county
        )
      );

      return { previous };
    },
    onError: (_error, _payload, context) => {
      queryClient.setQueryData(COUNTIES_KEY, context?.previous);
      toast.error("Failed to update assignment");
    },
    onSuccess: () => toast.success("Assignment updated successfully!"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: COUNTIES_KEY });
    },
  });

  const deleteCountyMutation = useMutation({
    mutationFn: deleteCounty,
    onMutate: async (countyId: string) => {
      await queryClient.cancelQueries({ queryKey: COUNTIES_KEY });
      const previous = queryClient.getQueryData<CountyRow[]>(COUNTIES_KEY);

      queryClient.setQueryData<CountyRow[]>(COUNTIES_KEY, (current = []) =>
        current.filter((county) => county.id !== countyId)
      );

      return { previous };
    },
    onError: (_error, _countyId, context) => {
      queryClient.setQueryData(COUNTIES_KEY, context?.previous);
      toast.error("Failed to delete county");
    },
    onSuccess: () => toast.success("County deleted successfully!"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: COUNTIES_KEY });
    },
  });

  const handleSubmit = (values: CountyFormType) => {
    if (editingCounty) {
      updateLiaisonsMutation.mutate({
        countyId: editingCounty.id,
        liaisons: values.liaisons,
      });
      return;
    }
    createCountyMutation.mutate(values);
  };

  const assigned = counties?.filter((c) => c.liaisons.length > 0).length ?? 0;
  const total = counties?.length ?? 0;

  return (
    <div className="min-h-screen space-y-6 bg-gray-50 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title text-3xl font-bold tracking-tight sm:text-4xl">
            County Configuration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage county assignments and responsible personnel.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingCounty(null);
            setDialogOpen(true);
          }}
          className="bg-brand text-white hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" />
          Add County
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiStatTile
          label="Total Counties"
          value={total.toLocaleString()}
          isLoading={isLoading}
        />
        <KpiStatTile
          label="Assigned"
          value={assigned.toLocaleString()}
          isLoading={isLoading}
        />
        <KpiStatTile
          label="Unassigned"
          value={(total - assigned).toLocaleString()}
          isLoading={isLoading}
        />
      </div>

      <ReusableTable
        data={counties ?? []}
        isLoading={isLoading}
        emptyMessage="No counties configured yet"
        tableClassName="table-fixed min-w-[720px]"
        columns={[
          {
            key: "name",
            header: "County Name",
            className: "w-[24%]",
            render: (row: CountyRow) => (
              <span className="font-medium text-gray-900">{row.name}</span>
            ),
          },
          {
            key: "liaisons",
            header: "Assigned Person",
            className: "w-[34%] text-gray-600",
            render: (row: CountyRow) =>
              row.liaisons.length > 0 ? row.liaisons.join(", ") : "-",
          },
          {
            key: "status",
            header: "Status",
            className: "w-[24%]",
            render: (row: CountyRow) => (
              <Badge
                className={
                  row.liaisons.length > 0
                    ? "min-w-24 justify-center rounded-md border-transparent bg-[#2C86D9] px-4 py-1 text-white"
                    : "min-w-24 justify-center rounded-md border-transparent bg-[#64D1F4] px-4 py-1 text-white"
                }
              >
                {row.liaisons.length > 0 ? "Assigned" : "Unassigned"}
              </Badge>
            ),
          },
          {
            key: "action",
            header: "Action",
            className: "w-[18%]",
            render: (row: CountyRow) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingCounty(row);
                      setDialogOpen(true);
                    }}
                  >
                    Edit Assignment
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    disabled={deleteCountyMutation.isPending}
                    onClick={() => deleteCountyMutation.mutate(row.id)}
                  >
                    Delete County
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
      />

      <CountyFormDialog
        open={dialogOpen}
        onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}
        county={editingCounty}
        liaisons={liaisons ?? []}
        isSubmitting={
          createCountyMutation.isPending || updateLiaisonsMutation.isPending
        }
        onSubmit={handleSubmit}
      />
    </div>
  );
}
