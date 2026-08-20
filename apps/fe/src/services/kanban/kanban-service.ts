import { axiosClient } from "@/lib/axios-client";

export type StageType = "OPEN" | "WON" | "LOST";

export type KanbanStage = {
  id: string;
  name: string;
  color: string | null;
  order: number;
  stageType: StageType;
  probability: number;
  count: number;
  // Expected wins: count times probability, since a stage carries no amount.
  forecast: number;
};

export type KanbanTotals = {
  open: { count: number; forecast: number };
  won: { count: number; forecast: number };
  lost: { count: number; forecast: number };
  winRate: number;
  weightedForecast: number;
};

export type Kanban = {
  stageField: { id: string; name: string };
  stages: KanbanStage[];
  unstaged: { count: number };
  totals: KanbanTotals;
};

export type KanbanWinLoss = {
  won: { count: number; avgCycleDays: number };
  lost: { count: number; avgCycleDays: number };
  winRate: number;
  lostFromStage: { stage: string; count: number }[];
};

export type KanbanConfig = {
  stageField: { id: string; name: string } | null;
  stages: {
    id: string;
    optionName: string;
    color: string | null;
    optionOrder: number;
    stageType: StageType;
    probability: number | null;
  }[];
};

type KanbanRange = { from?: string; to?: string };

export const getKanban = async (
  moduleType: string,
  range: KanbanRange = {}
) => {
  const response = await axiosClient.get("/api/kanban", {
    params: { moduleType, ...range },
  });

  return response.data as Kanban;
};

export const getKanbanWinLoss = async (
  moduleType: string,
  range: KanbanRange = {}
) => {
  const response = await axiosClient.get("/api/kanban/win-loss", {
    params: { moduleType, ...range },
  });

  return response.data as KanbanWinLoss;
};

export const getKanbanConfig = async (moduleType: string) => {
  const response = await axiosClient.get("/api/kanban/config", {
    params: { moduleType },
  });

  return response.data as KanbanConfig;
};

export type KanbanCardPage = {
  data: ({ id: string; recordName: string } & Record<string, unknown>)[];
  pagination: { count: number };
};

// One card fetch for every module. The board list services hardcode their own
// moduleType, so a shared board could only ever show leads.
export const getKanbanCards = async (
  moduleType: string,
  stageFieldId: string,
  stageName: string,
  limit: number
) => {
  const response = await axiosClient.get("/api/boards", {
    params: {
      moduleType,
      filter: JSON.stringify({ [stageFieldId]: stageName }),
      limit,
      page: 1,
    },
  });

  return response.data as KanbanCardPage;
};

export const updateKanbanStages = async (body: {
  moduleType: string;
  stages: {
    optionId: string;
    optionOrder: number;
    stageType: StageType;
    probability?: number | null;
  }[];
}) => {
  const response = await axiosClient.patch("/api/kanban/stages", body);

  return response.data as KanbanConfig;
};
