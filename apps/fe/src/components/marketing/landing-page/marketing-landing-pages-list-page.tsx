import {
  createLandingPage,
  deleteLandingPage,
  getLandingPages,
  publishLandingPage,
  type MarketingLandingPage,
} from "@/services/marketing/landing-page-service";
import { Badge } from "@dashboard/ui/components/badge";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  Copy,
  ExternalLink,
  LayoutTemplate,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const MarketingLandingPagesListPage = () => {
  const { team } = useParams({ strict: false }) as { team: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["marketing-landing-pages"],
    queryFn: getLandingPages,
  });

  const createMutation = useMutation({
    mutationFn: () => createLandingPage({ name: name.trim() }),
    onSuccess: (created: MarketingLandingPage) => {
      toast.success("Landing page created");
      queryClient.invalidateQueries({ queryKey: ["marketing-landing-pages"] });
      setCreateOpen(false);
      setName("");
      navigate({
        to: "/$team/marketing/landing-pages/$pageId",
        params: { team, pageId: created.id },
      });
    },
    onError: () => toast.error("Failed to create landing page"),
  });

  const publishMutation = useMutation({
    mutationFn: (page: MarketingLandingPage) => publishLandingPage(page.id),
    onSuccess: () => {
      toast.success("Landing page published");
      queryClient.invalidateQueries({ queryKey: ["marketing-landing-pages"] });
    },
    onError: () => toast.error("Failed to publish landing page"),
  });

  const deleteMutation = useMutation({
    mutationFn: (page: MarketingLandingPage) => deleteLandingPage(page.id),
    onSuccess: () => {
      toast.success("Landing page deleted");
      queryClient.invalidateQueries({ queryKey: ["marketing-landing-pages"] });
    },
    onError: () => toast.error("Failed to delete landing page"),
  });

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/l/${slug}`);
    toast.success("Link copied");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              Landing Pages
            </h1>
            <p className="text-sm text-gray-500">
              Publish standalone pages built from reusable sections.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Page
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : pages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">
            No landing pages yet. Create one to get started.
          </p>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white divide-y divide-gray-100">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {page.name}
                    </span>
                    <Badge
                      variant={
                        page.status === "PUBLISHED" ? "default" : "outline"
                      }
                    >
                      {page.status}
                    </Badge>
                  </div>
                  {page.status === "PUBLISHED" && (
                    <button
                      type="button"
                      onClick={() => copyLink(page.slug)}
                      className="mt-1 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {`${window.location.origin}/l/${page.slug}`}
                      <Copy className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {page.status === "DRAFT" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => publishMutation.mutate(page)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Publish
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: "/$team/marketing/landing-pages/$pageId",
                        params: { team, pageId: page.id },
                      })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(page)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setName("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Landing Page</DialogTitle>
            <DialogDescription>
              Name your page. Add sections after creating it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="landing-page-name">Name</Label>
            <Input
              id="landing-page-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
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
    </div>
  );
};
