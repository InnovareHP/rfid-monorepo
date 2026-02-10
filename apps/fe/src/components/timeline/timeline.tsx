import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@dashboard/ui/components/dialog";
import { Textarea } from "@dashboard/ui/components/textarea";
import type { LeadHistoryItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import {
  createLeadTimeline,
  deleteLeadTimeline,
  editLeadTimeline,
  getLeadTimeline,
} from "@/services/lead/lead-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { Member } from "better-auth/plugins/organization";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ActivityAction from "./activity-action";

export default function LeadHistoryTimeline() {
  const [open, setOpen] = useState(false);
  const [newActivity, setNewActivity] = useState("");

  const { lead } = useParams({
    from: "/_team/$team/master-list/leads/$lead/timeline",
  });

  const qc = useQueryClient();
  const user = qc.getQueryData(["user-member"]) as Member;

  const { data: history = [] } = useQuery({
    queryKey: ["lead-timeline", lead],
    queryFn: async () => await getLeadTimeline(lead, 10, 1),
  });

  const addMutation = useMutation({
    mutationFn: async (newItem: LeadHistoryItem) => {
      await createLeadTimeline(lead, newItem);
    },
    onMutate: async (newItem) => {
      await qc.cancelQueries({ queryKey: ["lead-timeline", lead] });

      const prevData =
        qc.getQueryData<LeadHistoryItem[]>(["lead-timeline", lead]) || [];

      qc.setQueryData(["lead-timeline", lead], [...prevData, newItem]);

      return { prevData };
    },
    onError: (_err, _newItem, ctx) => {
      qc.setQueryData(["lead-timeline", lead], ctx?.prevData);
      toast.error("Failed to add activity");
    },
    onSuccess: () => {
      toast.success("Activity added successfully");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["lead-timeline", lead] });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (id: string) => {
      await editLeadTimeline(id);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["lead-timeline", lead] });

      const prevData =
        qc.getQueryData<LeadHistoryItem[]>(["lead-timeline", lead]) || [];

      qc.setQueryData(
        ["lead-timeline", lead],
        prevData.map((item) => (item.id === id ? { ...item } : item))
      );

      return { prevData };
    },
    onError: (_err, _newItem, ctx) => {
      qc.setQueryData(["lead-timeline", lead], ctx?.prevData);
      toast.error("Failed to edit activity");
    },
    onSuccess: () => {
      toast.success("Activity edited successfully");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["lead-timeline", lead] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteLeadTimeline(id);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["lead-timeline", lead] });

      const prevData =
        qc.getQueryData<LeadHistoryItem[]>(["lead-timeline", lead]) || [];

      qc.setQueryData(
        ["lead-timeline", lead],
        prevData.filter((item) => item.id !== id)
      );

      return { prevData };
    },
    onError: (_err, _id, ctx) => {
      qc.setQueryData(["lead-timeline", lead], ctx?.prevData);
      toast.error("Failed to delete activity");
    },
    onSuccess: () => {
      toast.success("Activity deleted successfully");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["lead-timeline", lead] });
    },
  });

  const handleAddActivity = () => {
    if (!newActivity.trim()) return;

    const newItem: LeadHistoryItem = {
      id: crypto.randomUUID(),
      lead_id: lead,
      created_at: new Date().toISOString(),
      created_by: user?.id,
      action: "create",
      old_value: "",
      new_value: newActivity,
    };

    addMutation.mutate(newItem);
    setNewActivity("");
    setOpen(false);
  };

  const handleEditActivity = (id: string) => {
    editMutation.mutate(id);
  };

  const handleDeleteActivity = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="bg-background text-foreground p-6 rounded-lg min-h-[80vh] space-y-8">
      {/* ➕ Add Activity Button */}
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2 rounded-md flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Activity
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-card border border-border text-foreground max-w-md rounded-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Add Activity
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Textarea
                placeholder="Write a note or log an activity..."
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                className="bg-background border-border text-foreground placeholder-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
                rows={4}
              />

              <Button
                onClick={handleAddActivity}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 rounded-md"
              >
                Save Activity
              </Button>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogContent>
        </Dialog>
      </div>

      {history.map((item: LeadHistoryItem, idx: number) => (
        <div key={item.id} className="relative flex flex-col">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              {idx !== history.length - 1 && (
                <div className="w-px flex-1 bg-border" />
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-4 flex-1 hover:bg-muted transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{item.created_by}</p>

                  {item.action === "update" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Updated from{" "}
                      <span className="text-destructive">
                        "{item.old_value}"
                      </span>{" "}
                      →{" "}
                      <span className="text-green-500">"{item.new_value}"</span>
                    </p>
                  )}

                  {item.action === "create" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Created with value{" "}
                      <span className="text-green-500">"{item.new_value}"</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(item.created_at)}
                  </span>
                  <ActivityAction
                    handleEditActivity={() => handleEditActivity(item.id)}
                    handleDeleteActivity={() => handleDeleteActivity(item.id)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
