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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { Textarea } from "@dashboard/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CampaignListTable } from "./campaign-list-table";

export const MarketingCampaignsListPage = () => {
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingCampaign | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["marketing-campaigns"],
    queryFn: getCampaigns,
  });

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createCampaign({ name: name.trim(), description: description.trim() || undefined }),
    onSuccess: () => {
      toast.success("Campaign created");
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      setCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to create campaign"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateCampaign(editing!.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Campaign updated");
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      setEditing(null);
      resetForm();
    },
    onError: () => toast.error("Failed to update campaign"),
  });

  const archiveMutation = useMutation({
    mutationFn: (campaign: MarketingCampaign) => archiveCampaign(campaign.id),
    onSuccess: () => {
      toast.success("Campaign archived");
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
    },
    onError: () => toast.error("Failed to archive campaign"),
  });

  const deleteMutation = useMutation({
    mutationFn: (campaign: MarketingCampaign) => deleteCampaign(campaign.id),
    onSuccess: () => {
      toast.success("Campaign deleted");
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
    },
    onError: (error: unknown) => {
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
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Campaigns
            </h1>
            <p className="text-sm text-gray-500">
              Group forms, blasts, and landing pages together.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Campaign
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <CampaignListTable
            campaigns={campaigns}
            onEdit={openEdit}
            onArchive={(campaign) => archiveMutation.mutate(campaign)}
            onDelete={(campaign) => deleteMutation.mutate(campaign)}
          />
        )}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
            <DialogDescription>
              Name your campaign and add an optional description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-name">Name</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-description">Description</Label>
              <Textarea
                id="campaign-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name.trim() || createMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-campaign-name">Name</Label>
              <Input
                id="edit-campaign-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-campaign-description">Description</Label>
              <Textarea
                id="edit-campaign-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={!name.trim() || updateMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
