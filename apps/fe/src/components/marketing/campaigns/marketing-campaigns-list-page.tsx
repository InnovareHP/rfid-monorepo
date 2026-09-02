import { WriteGate } from "@/components/write-gate";
import { PageHeader } from "@/components/page-header";
import {
  archiveCampaign,
  createCampaign,
  deleteCampaign,
  getCampaigns,
  updateCampaign,
  type MarketingCampaign,
} from "@/services/marketing/campaign-service";
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
import { Loader2, Megaphone, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { KpiStatTile } from "../../analytics/charts/kpi-stat-tile";
import { SenderSelect } from "../senders/sender-select";
import {
  CAMPAIGN_STATUS_LABELS,
  CampaignListTable,
} from "./campaign-list-table";

const CAMPAIGNS_KEY = ["marketing-campaigns"];

type CampaignInput = {
  name: string;
  description: string;
  senderIdentityId: string | null;
};

export const MarketingCampaignsListPage = () => {
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingCampaign | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [senderIdentityId, setSenderIdentityId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusSort, setStatusSort] = useState<"asc" | "desc">("asc");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: CAMPAIGNS_KEY,
    queryFn: getCampaigns,
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setSenderIdentityId(null);
  };

  const createMutation = useMutation({
    mutationFn: (payload: CampaignInput) =>
      createCampaign({
        name: payload.name,
        description: payload.description || undefined,
        senderIdentityId: payload.senderIdentityId,
      }),
    // Show the row immediately; the refetch reconciles the real id.
    onMutate: async (payload: CampaignInput) => {
      const optimisticName = payload.name;
      const optimisticDescription = payload.description;
      setCreateOpen(false);
      resetForm();

      await queryClient.cancelQueries({ queryKey: CAMPAIGNS_KEY });
      const previous =
        queryClient.getQueryData<MarketingCampaign[]>(CAMPAIGNS_KEY);
      const now = new Date().toISOString();

      queryClient.setQueryData<MarketingCampaign[]>(
        CAMPAIGNS_KEY,
        (current = []) => [
          {
            id: `optimistic-${Date.now()}`,
            organizationId: previous?.[0]?.organizationId ?? "",
            name: optimisticName,
            description: optimisticDescription || null,
            status: "DRAFT",
            senderIdentityId: null,
            senderIdentity: null,
            createdBy: null,
            createdAt: now,
            updatedAt: now,
          },
          ...current,
        ]
      );

      return { previous };
    },
    onError: (_error, _payload, context) => {
      queryClient.setQueryData(CAMPAIGNS_KEY, context?.previous);
      toast.error("Failed to create campaign");
    },
    onSuccess: () => toast.success("Campaign created"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CampaignInput & { id: string }) =>
      updateCampaign(payload.id, {
        name: payload.name,
        description: payload.description || undefined,
        senderIdentityId: payload.senderIdentityId,
      }),
    onMutate: async (payload: CampaignInput & { id: string }) => {
      const editingId = payload.id;
      const nextName = payload.name;
      const nextDescription = payload.description;
      setEditing(null);
      resetForm();

      await queryClient.cancelQueries({ queryKey: CAMPAIGNS_KEY });
      const previous =
        queryClient.getQueryData<MarketingCampaign[]>(CAMPAIGNS_KEY);

      queryClient.setQueryData<MarketingCampaign[]>(
        CAMPAIGNS_KEY,
        (current = []) =>
          current.map((campaign) =>
            campaign.id === editingId
              ? {
                  ...campaign,
                  name: nextName,
                  description: nextDescription || null,
                }
              : campaign
          )
      );

      return { previous };
    },
    onError: (_error, _payload, context) => {
      queryClient.setQueryData(CAMPAIGNS_KEY, context?.previous);
      toast.error("Failed to update campaign");
    },
    onSuccess: () => toast.success("Campaign updated"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (campaign: MarketingCampaign) => archiveCampaign(campaign.id),
    onMutate: async (campaign: MarketingCampaign) => {
      await queryClient.cancelQueries({ queryKey: CAMPAIGNS_KEY });
      const previous =
        queryClient.getQueryData<MarketingCampaign[]>(CAMPAIGNS_KEY);

      queryClient.setQueryData<MarketingCampaign[]>(
        CAMPAIGNS_KEY,
        (current = []) =>
          current.map((row) =>
            row.id === campaign.id ? { ...row, status: "ARCHIVED" } : row
          )
      );

      return { previous };
    },
    onError: (_error, _campaign, context) => {
      queryClient.setQueryData(CAMPAIGNS_KEY, context?.previous);
      toast.error("Failed to archive campaign");
    },
    onSuccess: () => toast.success("Campaign archived"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (campaign: MarketingCampaign) => deleteCampaign(campaign.id),
    onMutate: async (campaign: MarketingCampaign) => {
      await queryClient.cancelQueries({ queryKey: CAMPAIGNS_KEY });
      const previous =
        queryClient.getQueryData<MarketingCampaign[]>(CAMPAIGNS_KEY);

      queryClient.setQueryData<MarketingCampaign[]>(
        CAMPAIGNS_KEY,
        (current = []) => current.filter((row) => row.id !== campaign.id)
      );

      return { previous };
    },
    onSuccess: () => toast.success("Campaign deleted"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
    onError: (error: unknown, _campaign, context) => {
      queryClient.setQueryData(
        CAMPAIGNS_KEY,
        (context as { previous?: MarketingCampaign[] } | undefined)?.previous
      );
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Failed to delete campaign";
      toast.error(message);
    },
  });

  const openEdit = (campaign: MarketingCampaign) => {
    setEditing(campaign);
    setName(campaign.name);
    setDescription(campaign.description ?? "");
    setSenderIdentityId(campaign.senderIdentityId);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matched = term
      ? campaigns.filter((campaign) =>
          campaign.name.toLowerCase().includes(term)
        )
      : campaigns;

    return [...matched].sort((a, b) => {
      const compared = CAMPAIGN_STATUS_LABELS[a.status].localeCompare(
        CAMPAIGN_STATUS_LABELS[b.status]
      );
      return statusSort === "asc" ? compared : -compared;
    });
  }, [campaigns, search, statusSort]);

  const activeCount = campaigns.filter((c) => c.status === "ACTIVE").length;
  const draftCount = campaigns.filter((c) => c.status === "DRAFT").length;

  const dialogOpen = createOpen || editing !== null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="page-style">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
        title="Campaigns"
        description="Group forms, blasts, and landing pages together."
      />

        <WriteGate>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-brand text-white hover:bg-brand/90"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </WriteGate>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiStatTile
          label="Total Campaigns"
          value={campaigns.length.toLocaleString()}
          isLoading={isLoading}
        />
        <KpiStatTile
          label="Active"
          value={activeCount.toLocaleString()}
          isLoading={isLoading}
        />
        <KpiStatTile
          label="Drafts"
          value={draftCount.toLocaleString()}
          isLoading={isLoading}
        />
      </div>

      <Input
        placeholder="Search campaigns...."
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        className="w-full bg-white sm:w-80"
      />

      <CampaignListTable
        campaigns={filtered.slice((page - 1) * pageSize, page * pageSize)}
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
        onEdit={openEdit}
        onArchive={(campaign) => archiveMutation.mutate(campaign)}
        onDelete={(campaign) => deleteMutation.mutate(campaign)}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (open) return;
          setCreateOpen(false);
          setEditing(null);
          resetForm();
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogFormHeader
            icon={<Megaphone />}
            title={editing ? "Edit Campaign" : "New Campaign"}
            description="Name your campaign and add an optional description."
          />

          <div className="space-y-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">
                Campaign Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-description">Description</Label>
              <Textarea
                id="campaign-description"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <SenderSelect
              value={senderIdentityId}
              onChange={setSenderIdentityId}
            />
          </div>

          <DialogFormFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setEditing(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const payload = {
                  name: name.trim(),
                  description: description.trim(),
                  senderIdentityId,
                };
                if (editing) {
                  updateMutation.mutate({ ...payload, id: editing.id });
                  return;
                }
                createMutation.mutate(payload);
              }}
              disabled={!name.trim() || isSaving}
              className="bg-brand text-white hover:bg-brand/90"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {editing ? "Save Changes" : "Create Campaign"}
            </Button>
          </DialogFormFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
