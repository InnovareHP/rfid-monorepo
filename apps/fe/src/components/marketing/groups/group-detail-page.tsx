import { PageHeader } from "@/components/PageHeader";
import {
  getGroup,
  getGroupMembers,
} from "@/services/marketing/group-service";
import { Button } from "@dashboard/ui/components/button";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";
import { useState } from "react";
import { GroupEditorDialog } from "./group-editor-dialog";
import { GroupMembersTable } from "./group-members-table";

const PAGE_SIZE = 50;

export const GroupDetailPage = () => {
  const { team, groupId } = useParams({ strict: false }) as {
    team: string;
    groupId: string;
  };
  const navigate = useNavigate();

  const [editorOpen, setEditorOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: group } = useQuery({
    queryKey: ["marketing-group", groupId],
    queryFn: () => getGroup(groupId),
  });

  const { data: members } = useQuery({
    queryKey: ["marketing-group-members", groupId, page],
    queryFn: () => getGroupMembers(groupId, { page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const pageCount = members ? Math.ceil(members.total / PAGE_SIZE) : 1;

  return (
    <div className="page-style">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to groups"
            onClick={() =>
              navigate({ to: "/$team/marketing/groups", params: { team } })
            }
          >
            <ArrowLeft className="size-4" />
          </Button>
          <PageHeader
            title={group?.name ?? "Group"}
            description={
              group?.description ??
              `Every ${group?.moduleType.toLowerCase() ?? "record"} matching this group's criteria.`
            }
          />
        </div>

        <Button variant="outline" onClick={() => setEditorOpen(true)}>
          <Pencil className="size-4" />
          Edit Group
        </Button>
      </div>

      <GroupMembersTable page={members} />

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <GroupEditorDialog
        open={editorOpen}
        group={group ?? null}
        onOpenChange={setEditorOpen}
      />
    </div>
  );
};
