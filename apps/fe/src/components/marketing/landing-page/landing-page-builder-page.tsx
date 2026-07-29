import { SectionEditorPanel } from "@/components/marketing/landing-page/section-editor-panel";
import { SectionListItem } from "@/components/marketing/landing-page/section-list-item";
import { SectionTypePicker } from "@/components/marketing/landing-page/section-type-picker";
import { getForms } from "@/services/marketing/form-service";
import {
  getLandingPage,
  publishLandingPage,
  updateLandingPage,
  type LandingSection,
} from "@/services/marketing/landing-page-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import axios from "axios";
import { ArrowLeft, Copy, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const createDefaultSection = (
  type: LandingSection["type"]
): LandingSection => {
  const id = crypto.randomUUID();

  switch (type) {
    case "HERO":
      return { id, type, props: { heading: "New hero heading" } };
    case "TEXT":
      return { id, type, props: { body: "New text section" } };
    case "IMAGE":
      return { id, type, props: { src: "", alt: "" } };
    case "FORM_EMBED":
      return { id, type, props: {} };
    case "CTA":
      return { id, type, props: { buttonLabel: "Learn more", href: "" } };
  }
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  return fallback;
};

export const LandingPageBuilderPage = () => {
  const { team, pageId } = useParams({ strict: false }) as {
    team: string;
    pageId: string;
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: page, isLoading } = useQuery({
    queryKey: ["marketing-landing-page", pageId],
    queryFn: () => getLandingPage(pageId),
  });

  const { data: forms = [] } = useQuery({
    queryKey: ["marketing-forms"],
    queryFn: getForms,
  });

  const [name, setName] = useState("");
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [formId, setFormId] = useState<string | null>(null);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!page) return;
    setName(page.name);
    setSections(page.sections);
    setFormId(page.formId);
    setSeoTitle(page.seoTitle ?? "");
    setSeoDescription(page.seoDescription ?? "");
    setSelectedSectionId((current) => current ?? page.sections[0]?.id ?? null);
  }, [page]);

  const hasFormEmbed = sections.some(
    (section) => section.type === "FORM_EMBED"
  );
  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      updateLandingPage(pageId, {
        name,
        sections,
        formId: formId ?? undefined,
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
      }),
    onSuccess: () => {
      toast.success("Landing page saved");
      queryClient.invalidateQueries({
        queryKey: ["marketing-landing-page", pageId],
      });
      queryClient.invalidateQueries({ queryKey: ["marketing-landing-pages"] });
    },
    onError: (error: unknown) =>
      toast.error(extractErrorMessage(error, "Failed to save landing page")),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishLandingPage(pageId),
    onSuccess: () => {
      toast.success("Landing page published");
      queryClient.invalidateQueries({
        queryKey: ["marketing-landing-page", pageId],
      });
      queryClient.invalidateQueries({ queryKey: ["marketing-landing-pages"] });
    },
    onError: (error: unknown) =>
      toast.error(
        extractErrorMessage(error, "Failed to publish landing page")
      ),
  });

  const handleAddSection = (type: LandingSection["type"]) => {
    const section = createDefaultSection(type);
    setSections((prev) => [...prev, section]);
    setSelectedSectionId(section.id);
  };

  const handleRemoveSection = (id: string) => {
    setSections((prev) => prev.filter((section) => section.id !== id));
    setSelectedSectionId((current) => (current === id ? null : current));
  };

  const handleSectionChange = (updated: LandingSection) => {
    setSections((prev) =>
      prev.map((section) => (section.id === updated.id ? updated : section))
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setSections((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const copyLink = () => {
    if (!page) return;
    navigator.clipboard.writeText(`${window.location.origin}/l/${page.slug}`);
    toast.success("Link copied");
  };

  if (isLoading || !page) {
    return <div className="p-8 text-sm text-gray-400">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate({
                  to: "/$team/marketing/landing-pages",
                  params: { team },
                })
              }
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="text-lg font-semibold w-64"
            />
            <Badge variant={page.status === "PUBLISHED" ? "default" : "outline"}>
              {page.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {page.status === "DRAFT" && (
              <Button
                variant="outline"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                <Send className="h-4 w-4 mr-1" />
                Publish
              </Button>
            )}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </div>
        </div>

        {page.status === "PUBLISHED" && (
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <Copy className="h-3.5 w-3.5" />
            {`${window.location.origin}/l/${page.slug}`}
          </button>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <SectionTypePicker
              hasFormEmbed={hasFormEmbed}
              onAdd={handleAddSection}
            />

            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-700">SEO</h3>
              <div className="space-y-1.5">
                <Label htmlFor="seo-title">Title</Label>
                <Input
                  id="seo-title"
                  value={seoTitle}
                  onChange={(event) => setSeoTitle(event.target.value)}
                  maxLength={70}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seo-description">Description</Label>
                <Input
                  id="seo-description"
                  value={seoDescription}
                  onChange={(event) => setSeoDescription(event.target.value)}
                  maxLength={160}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Sections</h3>
            {sections.length === 0 ? (
              <p className="text-sm text-gray-400">
                Add a section from the left panel to build this page.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {sections.map((section) => (
                      <SectionListItem
                        key={section.id}
                        section={section}
                        selected={section.id === selectedSectionId}
                        onSelect={setSelectedSectionId}
                        onRemove={handleRemoveSection}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {selectedSection && (
              <SectionEditorPanel
                section={selectedSection}
                onChange={handleSectionChange}
                formId={formId}
                onFormIdChange={setFormId}
                availableForms={forms}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
