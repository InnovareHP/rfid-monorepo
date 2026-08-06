import { PageHeader } from "@/components/PageHeader";
import { KpiStatTile } from "@/components/analytics/charts/kpi-stat-tile";
import {
  LANDING_PAGE_STATUS_LABELS,
  LandingPageListTable,
} from "@/components/marketing/landing-page/landing-page-list-table";
import {
  createLandingPage,
  deleteLandingPage,
  getLandingPages,
  type MarketingLandingPage,
} from "@/services/marketing/landing-page-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormFooter,
  DialogFormHeader,
} from "@dashboard/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Loader2, Megaphone, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const LANDING_PAGES_KEY = ["marketing-landing-pages"];

const createPageSchema = z.object({
  name: z.string().trim().min(1, "Landing page name is required"),
});

type CreatePageValues = z.infer<typeof createPageSchema>;

export const MarketingLandingPagesListPage = () => {
  const { team } = useParams({ strict: false }) as { team: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusSort, setStatusSort] = useState<"asc" | "desc">("asc");

  const { data: pages = [], isLoading } = useQuery({
    queryKey: LANDING_PAGES_KEY,
    queryFn: getLandingPages,
  });

  const form = useForm<CreatePageValues>({
    resolver: zodResolver(createPageSchema),
    defaultValues: { name: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreatePageValues) =>
      createLandingPage({ name: values.name }),
    onSuccess: (created: MarketingLandingPage) => {
      toast.success("Landing page created");
      queryClient.invalidateQueries({ queryKey: LANDING_PAGES_KEY });
      setCreateOpen(false);
      form.reset();
      navigate({
        to: "/$team/marketing/landing-pages/$pageId",
        params: { team, pageId: created.id },
      });
    },
    onError: () => toast.error("Failed to create landing page"),
  });

  const deleteMutation = useMutation({
    mutationFn: (target: MarketingLandingPage) => deleteLandingPage(target.id),
    onMutate: async (target: MarketingLandingPage) => {
      await queryClient.cancelQueries({ queryKey: LANDING_PAGES_KEY });
      const previous =
        queryClient.getQueryData<MarketingLandingPage[]>(LANDING_PAGES_KEY);

      queryClient.setQueryData<MarketingLandingPage[]>(
        LANDING_PAGES_KEY,
        (current = []) => current.filter((row) => row.id !== target.id)
      );

      return { previous };
    },
    onError: (_error, _target, context) => {
      queryClient.setQueryData(LANDING_PAGES_KEY, context?.previous);
      toast.error("Failed to delete landing page");
    },
    onSuccess: () => toast.success("Landing page deleted"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LANDING_PAGES_KEY });
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matched = term
      ? pages.filter((row) => row.name.toLowerCase().includes(term))
      : pages;

    return [...matched].sort((a, b) => {
      const compared = LANDING_PAGE_STATUS_LABELS[a.status].localeCompare(
        LANDING_PAGE_STATUS_LABELS[b.status]
      );
      return statusSort === "asc" ? compared : -compared;
    });
  }, [pages, search, statusSort]);

  const publishedCount = pages.filter(
    (row) => row.status === "PUBLISHED"
  ).length;

  return (
    <div className="page-style">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
        title="Landing Pages"
        description="Publish standalone pages built from reusable sections."
      />

        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-brand text-white hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" />
          New Page
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiStatTile
          label="Total Pages"
          value={pages.length.toLocaleString()}
          isLoading={isLoading}
        />
        <KpiStatTile
          label="Published"
          value={publishedCount.toLocaleString()}
          isLoading={isLoading}
        />
        <KpiStatTile
          label="Drafts"
          value={(pages.length - publishedCount).toLocaleString()}
          isLoading={isLoading}
        />
      </div>

      <Input
        placeholder="Search pages...."
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        className="w-full bg-white sm:w-80"
      />

      <LandingPageListTable
        pages={filtered.slice((page - 1) * pageSize, page * pageSize)}
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
        onEdit={(row) =>
          navigate({
            to: "/$team/marketing/landing-pages/$pageId",
            params: { team, pageId: row.id },
          })
        }
        onDelete={(row) => deleteMutation.mutate(row)}
      />

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) form.reset();
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogFormHeader
            icon={<Megaphone />}
            title="New Landing Page"
            description="Name your page. Add sections after creating it."
          />

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                createMutation.mutate(values)
              )}
            >
              <div className="space-y-4 px-6 py-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Landing Page Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFormFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-brand text-white hover:bg-brand/90"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Create Landing Page
                </Button>
              </DialogFormFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
