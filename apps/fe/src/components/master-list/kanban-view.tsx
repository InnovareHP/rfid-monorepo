import { formatCurrency } from "@/lib/helper/helper";
import { getLeads, updateLead } from "@/services/lead/lead-service";
import { getPipeline } from "@/services/pipeline/pipeline-service";
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
    data: pipeline,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pipeline", moduleType],
    queryFn: () => getPipeline(moduleType),
  });

  const stages = pipeline?.stages ?? [];
  const stageFieldId = pipeline?.stageField.id;
  const amountFieldName = pipeline?.amountField?.name;

  const cardQueries = useQueries({
    queries: stages.map((stage) => ({
      queryKey: ["pipeline-cards", moduleType, stage.id],
      queryFn: () =>
        getLeads({
          filter: { [stageFieldId as string]: stage.name },
          limit: CARDS_PER_STAGE,
          page: 1,
        }) as Promise<CardPage>,
      enabled: Boolean(stageFieldId),
    })),
  });

  const moveMutation = useMutation({
    mutationFn: ({ card, toStageName }: { card: KanbanCard; fromStageId: string; toStageId: string; toStageName: string }) =>
      updateLead(card.id, stageFieldId as string, toStageName, moduleType),
    onMutate: async ({ card, fromStageId, toStageId }) => {
      await queryClient.cancelQueries({
        queryKey: ["pipeline-cards", moduleType],
      });
      const previous = queryClient.getQueriesData({
        queryKey: ["pipeline-cards", moduleType],
      });

      queryClient.setQueryData<CardPage>(
        ["pipeline-cards", moduleType, fromStageId],
        (old) =>
          old && {
            ...old,
            data: old.data.filter((row) => row.id !== card.id),
          }
      );
      queryClient.setQueryData<CardPage>(
        ["pipeline-cards", moduleType, toStageId],
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
      queryClient.invalidateQueries({ queryKey: ["pipeline", moduleType] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["pipeline-cards", moduleType],
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

  if (error || !pipeline) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="font-medium text-gray-900">Pipeline not configured</p>
        <p className="mt-1 text-sm text-gray-500">
          Pick a status field as the pipeline stage and a number field as deal
          value in pipeline settings.
        </p>
      </div>
    );
  }

  const { totals, unstaged } = pipeline;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryTile label="Open value" value={formatCurrency(totals.open.value)} hint={`${totals.open.count} deals`} />
        <SummaryTile label="Weighted forecast" value={formatCurrency(totals.weightedForecast)} hint="Open x probability + won" />
        <SummaryTile label="Won" value={formatCurrency(totals.won.value)} hint={`${totals.won.count} deals`} />
        <SummaryTile label="Win rate" value={`${totals.winRate}%`} hint={`${totals.lost.count} lost`} />
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
              className="flex w-72 shrink-0 flex-col rounded-md border border-gray-200 bg-gray-50"
            >
              <div className="flex items-start justify-between gap-2 border-b border-gray-200 p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: stage.color ?? "#94a3b8" }}
                    />
                    <span className="font-medium text-gray-900">
                      {stage.name}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {total} - {formatCurrency(stage.value)}
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
                    className="rounded-md border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-gray-300"
                  >
                    <p className="truncate text-sm font-medium text-gray-900">
                      {card.recordName}
                    </p>
                    {amountFieldName && (
                      <p className="mt-1 text-xs text-gray-500">
                        {formatCurrency(
                          Number(
                            String(card[amountFieldName] ?? "0").replace(
                              /[^0-9.-]/g,
                              ""
                            )
                          ) || 0
                        )}
                      </p>
                    )}
                  </button>
                ))}

                {total > cards.length && (
                  <p className="p-2 text-xs text-gray-500">
                    {total - cards.length} more in this stage
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {unstaged.count > 0 && (
          <div className="flex w-72 shrink-0 flex-col rounded-md border border-dashed border-gray-300 bg-white p-3">
            <span className="font-medium text-gray-900">No stage</span>
            <p className="mt-1 text-xs text-gray-500">
              {unstaged.count} records - {formatCurrency(unstaged.value)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}
