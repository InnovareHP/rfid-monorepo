import { KanbanSummaryTile } from "@/components/kanban/kanban-summary-tile";
import { updateLead } from "@/services/lead/lead-service";
import {
  getKanban,
  getKanbanCards,
} from "@/services/kanban/kanban-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

const CARDS_PER_STAGE = 25;
import { boardQueryKey } from "@/lib/helper/board-query-key";

type KanbanCard = { id: string; recordName: string } & Record<string, unknown>;

type CardPage = { data: KanbanCard[]; pagination: { count: number } };

type DragState = { card: KanbanCard; stageId: string };

export default function KanbanView({
  moduleType = "LEAD",
  onCardOpen,
}: {
  moduleType?: string;
  onCardOpen: (recordId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [dragging, setDragging] = useState<DragState | null>(null);

  const {
    data: kanban,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["kanban", moduleType],
    queryFn: () => getKanban(moduleType),
  });

  const stages = kanban?.stages ?? [];
  const stageFieldId = kanban?.stageField.id;

  const cardQueries = useQueries({
    queries: stages.map((stage) => ({
      queryKey: ["kanban-cards", moduleType, stage.id],
      queryFn: () =>
        getKanbanCards(
          moduleType,
          stageFieldId as string,
          stage.name,
          CARDS_PER_STAGE
        ) as Promise<CardPage>,
      enabled: Boolean(stageFieldId),
    })),
  });

  const moveMutation = useMutation({
    mutationFn: ({
      card,
      toStageName,
    }: {
      card: KanbanCard;
      fromStageId: string;
      toStageId: string;
      toStageName: string;
    }) => updateLead(card.id, stageFieldId as string, toStageName, moduleType),
    onMutate: async ({ card, fromStageId, toStageId }) => {
      await queryClient.cancelQueries({
        queryKey: ["kanban-cards", moduleType],
      });
      const previous = queryClient.getQueriesData({
        queryKey: ["kanban-cards", moduleType],
      });

      queryClient.setQueryData<CardPage>(
        ["kanban-cards", moduleType, fromStageId],
        (old) =>
          old && {
            ...old,
            data: old.data.filter((row) => row.id !== card.id),
          }
      );
      queryClient.setQueryData<CardPage>(
        ["kanban-cards", moduleType, toStageId],
        (old) => old && { ...old, data: [card, ...old.data] }
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      );
      toast.error("Failed to move record");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban", moduleType] });
      queryClient.invalidateQueries({
        queryKey: boardQueryKey(moduleType),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["kanban-cards", moduleType],
      });
    },
  });

  const handleDrop = (stageId: string, stageName: string) => {
    if (!dragging || dragging.stageId === stageId) return setDragging(null);
    moveMutation.mutate({
      card: dragging.card,
      fromStageId: dragging.stageId,
      toStageId: stageId,
      toStageName: stageName,
    });
    setDragging(null);
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error || !kanban) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card p-8 text-center">
        <p className="font-medium text-foreground">Kanban not available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This module has no status field to group by. Add one to the board, then
          set each option's outcome in Kanban settings.
        </p>
      </div>
    );
  }

  const { totals, unstaged } = kanban;

  return (
    <div className="space-y-4">
      <div className="sm:max-w-xs">
        <KanbanSummaryTile
          label="Open"
          value={String(totals.open.count)}
          hint="records in progress"
        />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage, index) => {
          const query = cardQueries[index];
          const cards = query?.data?.data ?? [];
          const total = query?.data?.pagination.count ?? stage.count;

          return (
            <div
              key={stage.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(stage.id, stage.name)}
              className="flex w-72 shrink-0 flex-col rounded-md border border-border bg-muted"
            >
              <div className="flex items-start justify-between gap-2 border-b border-border p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: stage.color ?? "#94a3b8" }}
                    />
                    <span className="font-medium text-foreground">
                      {stage.name}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {total} {total === 1 ? "record" : "records"}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {stage.stageType === "OPEN"
                    ? `${stage.probability}%`
                    : stage.stageType}
                </Badge>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-2">
                {query?.isLoading &&
                  Array.from({ length: 3 }).map((_, skeletonIndex) => (
                    <Skeleton key={skeletonIndex} className="h-16 w-full" />
                  ))}

                {cards.map((card) => (
                  <button
                    key={card.id}
                    draggable
                    onDragStart={() => setDragging({ card, stageId: stage.id })}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => onCardOpen(card.id)}
                    className="rounded-md border border-border bg-card p-3 text-left shadow-sm transition hover:border-ring"
                  >
                    <p className="truncate text-sm font-medium text-foreground">
                      {card.recordName}
                    </p>
                  </button>
                ))}

                {total > cards.length && (
                  <p className="p-2 text-xs text-muted-foreground">
                    {total - cards.length} more in this stage
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {unstaged.count > 0 && (
          <div className="flex w-72 shrink-0 flex-col rounded-md border border-dashed border-border bg-card p-3">
            <span className="font-medium text-foreground">No stage</span>
            <p className="mt-1 text-xs text-muted-foreground">
              {unstaged.count} {unstaged.count === 1 ? "record" : "records"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
