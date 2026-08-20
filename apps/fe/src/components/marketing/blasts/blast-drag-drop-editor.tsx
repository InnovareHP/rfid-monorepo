import type { MarketingCampaign } from "@/services/marketing/campaign-service";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@dashboard/ui/components/tabs";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import {
  createDefaultBlock,
  type BlastBlockType,
  type BlastFormValues,
} from "./blast-block-schema";
import { BlastBlockEditorPanel } from "./blast-block-editor-panel";
import { BlastBlockFrame } from "./blast-block-frame";
import { BlastBlockPicker } from "./blast-block-picker";
import { BlastEmailPreview } from "./blast-email-preview";
import { BlastSettingsPanel } from "./blast-settings-panel";

type BlastDragDropEditorProps = {
  form: UseFormReturn<BlastFormValues>;
  campaigns: MarketingCampaign[];
  disabled: boolean;
};

export const BlastDragDropEditor = ({
  form,
  campaigns,
  disabled,
}: BlastDragDropEditorProps) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [tab, setTab] = useState("content");

  const blocks = useWatch({ control: form.control, name: "blocks" }) ?? [];
  const selectedIndex = blocks.findIndex(
    (block) => block.id === selectedBlockId
  );
  const selectedBlock = selectedIndex === -1 ? null : blocks[selectedIndex];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const setBlocks = (next: BlastFormValues["blocks"]) =>
    form.setValue("blocks", next, { shouldDirty: true });

  const handleAdd = (type: BlastBlockType) => {
    const block = createDefaultBlock(type);
    setBlocks([...blocks, block]);
    setSelectedBlockId(block.id);
  };

  const handleDuplicate = (index: number) => {
    const copy = { ...blocks[index], id: crypto.randomUUID() };
    setBlocks([
      ...blocks.slice(0, index + 1),
      copy,
      ...blocks.slice(index + 1),
    ]);
    setSelectedBlockId(copy.id);
  };

  const handleRemove = (index: number) => {
    setBlocks(blocks.filter((_, position) => position !== index));
    setSelectedBlockId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setBlocks(arrayMove(blocks, oldIndex, newIndex));
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card lg:flex-row">
      <div className="flex-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(0,0,0,0.02)_6px,rgba(0,0,0,0.02)_12px)] p-8">
        <div className="mx-auto w-full max-w-xl overflow-hidden rounded-xl bg-card shadow-sm">
          {blocks.length === 0 ? (
            <p className="p-12 text-center text-sm text-muted-foreground">
              Add a block from the Content panel to build this email.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((block) => block.id)}
                strategy={verticalListSortingStrategy}
              >
                <BlastEmailPreview
                  blocks={blocks}
                  editing
                  wrapBlock={(block, node) => (
                    <BlastBlockFrame
                      id={block.id}
                      selected={block.id === selectedBlockId}
                      onSelect={setSelectedBlockId}
                    >
                      {node}
                    </BlastBlockFrame>
                  )}
                />
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      <aside className="w-full shrink-0 border-l border-border bg-card p-4 lg:w-80">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="settings">Email Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="pt-4">
            {selectedBlock ? (
              <BlastBlockEditorPanel
                key={selectedBlock.id}
                form={form}
                block={selectedBlock}
                index={selectedIndex}
                onDuplicate={() => handleDuplicate(selectedIndex)}
                onDelete={() => handleRemove(selectedIndex)}
              />
            ) : (
              <BlastBlockPicker onAdd={handleAdd} />
            )}
          </TabsContent>

          <TabsContent value="settings" className="pt-4">
            <BlastSettingsPanel
              form={form}
              campaigns={campaigns}
              disabled={disabled}
            />
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
};
