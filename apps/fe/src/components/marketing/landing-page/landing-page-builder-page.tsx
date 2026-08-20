import { BuilderPageSkeleton } from "@/components/skeletons/builder-page-skeleton";
import {
  landingPageFormSchema,
  type LandingPageFormValues,
} from "@/components/marketing/landing-page/landing-page-form-schema";
import { LandingPagePreview } from "@/components/marketing/landing-page/landing-page-preview";
import { PageSettingsPanel } from "@/components/marketing/landing-page/page-settings-panel";
import { PreviewSectionFrame } from "@/components/marketing/landing-page/preview-section-frame";
import { SectionEditorPanel } from "@/components/marketing/landing-page/section-editor-panel";
import { SectionTypePicker } from "@/components/marketing/landing-page/section-type-picker";
import { getForms } from "@/services/marketing/form-service";
import {
  getLandingPage,
  publishLandingPage,
  updateLandingPage,
} from "@/services/marketing/landing-page-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Form } from "@dashboard/ui/components/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@dashboard/ui/components/tabs";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import axios from "axios";
import { ArrowLeft, Loader2, Plus, Send } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

type LandingSectionValue = LandingPageFormValues["sections"][number];

const createDefaultSection = (
  type: LandingSectionValue["type"]
): LandingSectionValue => {
  const id = crypto.randomUUID();

  switch (type) {
    case "HERO":
      return {
        id,
        type,
        props: {
          heading: "New Hero Heading",
          subheading: "Hero subheading appears here",
        },
      };
    case "TEXT":
      return {
        id,
        type,
        props: { heading: "Heading", body: "Body text appears here" },
      };
    case "IMAGE":
      return { id, type, props: { src: "", alt: "" } };
    case "FORM_EMBED":
      return { id, type, props: {} };
    case "CTA":
      return { id, type, props: { buttonLabel: "Learn More", href: "" } };
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

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null
  );
  const [tab, setTab] = useState("section");

  const form = useForm<LandingPageFormValues>({
    resolver: zodResolver(landingPageFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      seoTitle: "",
      seoDescription: "",
      formId: null,
      sections: [],
    },
    values: page
      ? {
          name: page.name,
          slug: page.slug,
          seoTitle: page.seoTitle ?? "",
          seoDescription: page.seoDescription ?? "",
          formId: page.formId,
          sections: page.sections,
        }
      : undefined,
  });

  const sections = useWatch({ control: form.control, name: "sections" });
  const formId = useWatch({ control: form.control, name: "formId" });
  const name = useWatch({ control: form.control, name: "name" });

  const selectedIndex = sections.findIndex(
    (section) => section.id === selectedSectionId
  );
  const selectedSection = selectedIndex === -1 ? null : sections[selectedIndex];
  const hasFormEmbed = sections.some((section) => section.type === "FORM_EMBED");
  const embeddedFormName =
    forms.find((candidate) => candidate.id === formId)?.name ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const saveMutation = useMutation({
    mutationFn: (values: LandingPageFormValues) =>
      updateLandingPage(pageId, {
        name: values.name,
        slug: values.slug,
        sections: values.sections,
        formId: values.formId ?? undefined,
        seoTitle: values.seoTitle || undefined,
        seoDescription: values.seoDescription || undefined,
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
      toast.error(extractErrorMessage(error, "Failed to publish landing page")),
  });

  const setSections = (next: LandingSectionValue[]) =>
    form.setValue("sections", next, { shouldDirty: true });

  const handleAddSection = (type: LandingSectionValue["type"]) => {
    const section = createDefaultSection(type);
    setSections([...sections, section]);
    setSelectedSectionId(section.id);
  };

  const handleDuplicateSection = (index: number) => {
    const copy = { ...sections[index], id: crypto.randomUUID() };
    setSections([
      ...sections.slice(0, index + 1),
      copy,
      ...sections.slice(index + 1),
    ]);
    setSelectedSectionId(copy.id);
  };

  const handleRemoveSection = (index: number) => {
    setSections(sections.filter((_, position) => position !== index));
    setSelectedSectionId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setSections(arrayMove(sections, oldIndex, newIndex));
  };

  if (isLoading || !page) {
    return <BuilderPageSkeleton />;
  }

  return (
    <Form {...form}>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
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
            <h1 className="text-2xl font-semibold text-primary">{name}</h1>
            <Badge variant={page.status === "PUBLISHED" ? "default" : "outline"}>
              {page.status === "PUBLISHED" ? "Published" : "Draft"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saveMutation.isPending}
              onClick={form.handleSubmit((values) => saveMutation.mutate(values))}
            >
              {saveMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Draft
            </Button>
            <Button
              type="button"
              disabled={publishMutation.isPending}
              onClick={() => publishMutation.mutate()}
            >
              <Send className="h-4 w-4 mr-1" />
              Publish
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="flex-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(0,0,0,0.02)_6px,rgba(0,0,0,0.02)_12px)] p-8">
            <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-sm">
              {sections.length === 0 ? (
                <p className="p-12 text-center text-sm text-gray-400">
                  Add a section from the right panel to build this page.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sections.map((section) => section.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <LandingPagePreview
                      sections={sections}
                      embeddedForm={null}
                      editing
                      embeddedFormName={embeddedFormName}
                      wrapSection={(section, node) => (
                        <PreviewSectionFrame
                          id={section.id}
                          selected={section.id === selectedSectionId}
                          onSelect={setSelectedSectionId}
                        >
                          {node}
                        </PreviewSectionFrame>
                      )}
                    />
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

          <aside className="w-full shrink-0 border-l border-gray-200 bg-white p-4 lg:w-80">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="section">Section</TabsTrigger>
                <TabsTrigger value="settings">Page Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="section" className="pt-4">
                {selectedSection ? (
                  <div className="space-y-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSectionId(null)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Section
                    </Button>
                    <SectionEditorPanel
                      key={selectedSection.id}
                      form={form}
                      section={selectedSection}
                      index={selectedIndex}
                      availableForms={forms}
                      onDuplicate={() => handleDuplicateSection(selectedIndex)}
                      onDelete={() => handleRemoveSection(selectedIndex)}
                    />
                  </div>
                ) : (
                  <SectionTypePicker
                    hasFormEmbed={hasFormEmbed}
                    onAdd={handleAddSection}
                  />
                )}
              </TabsContent>
              <TabsContent value="settings" className="pt-4">
                <PageSettingsPanel form={form} />
              </TabsContent>
            </Tabs>
          </aside>
        </div>
      </div>
    </Form>
  );
};
