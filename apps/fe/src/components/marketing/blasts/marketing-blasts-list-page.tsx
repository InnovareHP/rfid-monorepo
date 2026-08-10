import { PageHeader } from "@/components/page-header";
import {
  createBlast,
  deleteBlast,
  getBlasts,
  type MarketingBlast,
} from "@/services/marketing/blast-service";
import { can } from "@/lib/permissions";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormFooter,
  DialogFormHeader,
} from "@dashboard/ui/components/dialog";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { Textarea } from "@dashboard/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useRouteContext } from "@tanstack/react-router";
import type { Member } from "better-auth/plugins/organization";
import { Loader2, Mail, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { KpiStatTile } from "../../analytics/charts/kpi-stat-tile";
import { MarketingSubNav } from "../marketing-sub-nav";
import { BLAST_STATUS_LABELS, BlastListTable } from "./blast-list-table";
import { BlastSendDialog } from "./blast-send-dialog";

export const MarketingBlastsListPage = () => {
  const { team } = useParams({ strict: false }) as { team: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // The org id already rides in the route context, so this avoids a per-mount
  // auth fetch and the undefined first render that flickered role-gated UI.
  const { activeOrganizationId } = useRouteContext({ from: "__root__" }) as {
    activeOrganizationId: string;
  };
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    activeOrganizationId,
  ]);
  const canSend = can(memberData?.role, { outreach: ["send"] });

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusSort, setStatusSort] = useState<"asc" | "desc">("asc");
  const [sendingBlast, setSendingBlast] = useState<MarketingBlast | null>(null);

  const { data: blasts = [], isLoading } = useQuery({
    queryKey: ["marketing-blasts"],
    queryFn: getBlasts,
  });

  const resetCreateState = () => {
    setName("");
    setSubject("");
    setBodyHtml("");
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createBlast({
        name: name.trim(),
        subject: subject.trim(),
        bodyHtml: bodyHtml.trim(),
      }),
    onSuccess: (created: MarketingBlast) => {
      toast.success("Blast created");
      queryClient.invalidateQueries({ queryKey: ["marketing-blasts"] });
      setCreateOpen(false);
      resetCreateState();
      navigate({
        to: "/$team/marketing/blasts/$blastId",
        params: { team, blastId: created.id },
      });
    },
    onError: () => toast.error("Failed to create blast"),
  });

  const deleteMutation = useMutation({
    mutationFn: (blast: MarketingBlast) => deleteBlast(blast.id),
    onSuccess: () => {
      toast.success("Blast deleted");
      queryClient.invalidateQueries({ queryKey: ["marketing-blasts"] });
    },
    onError: () => toast.error("Failed to delete blast"),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matched = term
      ? blasts.filter(
          (blast) =>
            blast.name.toLowerCase().includes(term) ||
            blast.subject.toLowerCase().includes(term)
        )
      : blasts;

    return [...matched].sort((a, b) => {
      const compared = BLAST_STATUS_LABELS[a.status].localeCompare(
        BLAST_STATUS_LABELS[b.status]
      );
      return statusSort === "asc" ? compared : -compared;
    });
  }, [blasts, search, statusSort]);

  const sentCount = blasts.filter((blast) => blast.status === "SENT").length;
  const draftCount = blasts.filter((blast) => blast.status === "DRAFT").length;

  return (
    <div className="page-style">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Blasts"
          description="Email one or more recipient groups."
        />

        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-brand text-white hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" />
          New Blast
        </Button>
      </div>

      <MarketingSubNav active="blasts" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiStatTile
          label="Total Blasts"
          value={blasts.length.toLocaleString()}
          isLoading={isLoading}
        />
        <KpiStatTile
          label="Sent"
          value={sentCount.toLocaleString()}
          isLoading={isLoading}
        />
        <KpiStatTile
          label="Drafts"
          value={draftCount.toLocaleString()}
          isLoading={isLoading}
        />
      </div>

      <Input
        placeholder="Search blasts...."
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        className="w-full bg-white sm:w-80"
      />

      <BlastListTable
        blasts={filtered.slice((page - 1) * pageSize, page * pageSize)}
        canSend={canSend}
        isLoading={isLoading}
        currentPage={page}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onToggleStatusSort={() =>
          setStatusSort((prev) => (prev === "asc" ? "desc" : "asc"))
        }
        onEdit={(blast) =>
          navigate({
            to: "/$team/marketing/blasts/$blastId",
            params: { team, blastId: blast.id },
          })
        }
        onSend={(blast) => setSendingBlast(blast)}
        onDelete={(blast) => deleteMutation.mutate(blast)}
      />

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateState();
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogFormHeader
            icon={<Mail />}
            title="New Blast"
            description="Set the basics now - audience, campaign, and module can be refined after creation."
          />

          <div className="space-y-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="blast-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="blast-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blast-subject">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="blast-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blast-body">Body</Label>
              <Textarea
                id="blast-body"
                rows={5}
                value={bodyHtml}
                onChange={(event) => setBodyHtml(event.target.value)}
              />
            </div>
          </div>

          <DialogFormFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                resetCreateState();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                !name.trim() ||
                !subject.trim() ||
                !bodyHtml.trim() ||
                createMutation.isPending
              }
              className="bg-brand text-white hover:bg-brand/90"
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create Blast
            </Button>
          </DialogFormFooter>
        </DialogContent>
      </Dialog>

      <BlastSendDialog
        blast={sendingBlast}
        onOpenChange={(open) => {
          if (!open) setSendingBlast(null);
        }}
      />
    </div>
  );
};
