import { authClient } from "@/lib/auth-client";
import {
  createBlast,
  deleteBlast,
  getBlasts,
  type MarketingBlast,
} from "@/services/marketing/blast-service";
import { isOrgAdmin } from "@dashboard/shared";
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
import { useNavigate, useParams } from "@tanstack/react-router";
import { Mail, Plus } from "lucide-react";
import { useState } from "react";
import type { Member } from "better-auth/plugins/organization";
import { toast } from "sonner";
import { BlastListTable } from "./blast-list-table";
import { BlastSendDialog } from "./blast-send-dialog";

export const MarketingBlastsListPage = () => {
  const { team } = useParams({ strict: false }) as { team: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: organizationData } = authClient.useActiveOrganization();
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    organizationData?.id,
  ]);
  const isOwner = isOrgAdmin(memberData?.role);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
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
        audienceFilter: { filter: {} },
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

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Blasts
            </h1>
            <p className="text-sm text-gray-500">
              Email a filtered audience of leads or referrals.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Blast
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <BlastListTable
            blasts={blasts}
            canSend={isOwner}
            onEdit={(blast) =>
              navigate({
                to: "/$team/marketing/blasts/$blastId",
                params: { team, blastId: blast.id },
              })
            }
            onSend={(blast) => setSendingBlast(blast)}
            onDelete={(blast) => deleteMutation.mutate(blast)}
          />
        )}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateState();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Blast</DialogTitle>
            <DialogDescription>
              Set the basics now — audience, campaign, and module can be
              refined after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="blast-name">Name</Label>
              <Input
                id="blast-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blast-subject">Subject</Label>
              <Input
                id="blast-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blast-body">Body</Label>
              <Textarea
                id="blast-body"
                rows={6}
                value={bodyHtml}
                onChange={(event) => setBodyHtml(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                !name.trim() ||
                !subject.trim() ||
                !bodyHtml.trim() ||
                createMutation.isPending
              }
            >
              Create
            </Button>
          </DialogFooter>
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
