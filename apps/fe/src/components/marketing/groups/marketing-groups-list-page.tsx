import { WriteGate } from "@/components/write-gate";
import { PageHeader } from "@/components/page-header";
import {
  deleteGroup,
  getGroups,
  type RecipientGroup,
} from "@/services/marketing/group-service";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { KpiStatTile } from "../../analytics/charts/kpi-stat-tile";
import { MarketingSubNav } from "../marketing-sub-nav";
import { GroupEditorDialog } from "./group-editor-dialog";
import { GroupListTable } from "./group-list-table";

const GROUPS_KEY = ["marketing-groups"];

export const MarketingGroupsListPage = () => {
  const { team } = useParams({ strict: false }) as { team: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<RecipientGroup | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: GROUPS_KEY,
    queryFn: getGroups,
  });

  const deleteMutation = useMutation({
    mutationFn: (group: RecipientGroup) => deleteGroup(group.id),
    onMutate: async (group: RecipientGroup) => {
      await queryClient.cancelQueries({ queryKey: GROUPS_KEY });
      const previous = queryClient.getQueryData<RecipientGroup[]>(GROUPS_KEY);

      queryClient.setQueryData<RecipientGroup[]>(GROUPS_KEY, (current = []) =>
        current.filter((row) => row.id !== group.id)
      );

      return { previous };
    },
    onSuccess: () => toast.success("Group deleted"),
    onError: (error: unknown, _group, context) => {
      queryClient.setQueryData(
        GROUPS_KEY,
        (context as { previous?: RecipientGroup[] } | undefined)?.previous
      );
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Failed to delete group";
      toast.error(message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: GROUPS_KEY }),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(term));
  }, [groups, search]);

  const usedByBlasts = groups.filter((g) => (g._count?.blasts ?? 0) > 0).length;

  return (
    <div className="page-style">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Groups"
          description="Saved audiences a blast can send to. Filtering lives here, not in the blast."
        />

        <WriteGate>
          <Button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
            className="bg-brand text-white hover:bg-brand/90"
          >
            <Plus className="h-4 w-4" />
            New Group
          </Button>
        </WriteGate>
      </div>

      <MarketingSubNav active="groups" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <KpiStatTile
          label="Total Groups"
          value={groups.length.toLocaleString()}
          isLoading={isLoading}
        />
        <KpiStatTile
          label="Used By A Blast"
          value={usedByBlasts.toLocaleString()}
          isLoading={isLoading}
        />
      </div>

      <Input
        placeholder="Search groups...."
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        className="w-full bg-white sm:w-80"
      />

      <GroupListTable
        groups={filtered.slice((page - 1) * pageSize, page * pageSize)}
        isLoading={isLoading}
        currentPage={page}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onOpen={(group) =>
          navigate({
            to: "/$team/marketing/groups/$groupId",
            params: { team, groupId: group.id },
          })
        }
        onEdit={(group) => {
          setEditing(group);
          setEditorOpen(true);
        }}
        onDelete={(group) => deleteMutation.mutate(group)}
      />

      <GroupEditorDialog
        open={editorOpen}
        group={editing}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditing(null);
        }}
      />
    </div>
  );
};
