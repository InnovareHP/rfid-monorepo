import { axiosClient } from "@/lib/axios-client";

export type StageType = "OPEN" | "WON" | "LOST";

export type PipelineStage = {
  id: string;
  name: string;
  color: string | null;
  order: number;
  stageType: StageType;
  probability: number;
  count: number;
  value: number;
  forecast: number;
};

export type PipelineTotals = {
  open: { count: number; value: number; forecast: number };
  won: { count: number; value: number; forecast: number };
  lost: { count: number; value: number; forecast: number };
  winRate: number;
  weightedForecast: number;
};

export type Pipeline = {
  stageField: { id: string; name: string };
  amountField: { id: string; name: string } | null;
  stages: PipelineStage[];
  unstaged: { count: number; value: number };
  totals: PipelineTotals;
};

export type PipelineWinLoss = {
  won: { count: number; avgCycleDays: number };
  lost: { count: number; avgCycleDays: number };
  winRate: number;
  lostFromStage: { stage: string; count: number }[];
};

export type PipelineConfig = {
  stageFieldId: string | null;
  amountFieldId: string | null;
  stageCandidates: { id: string; name: string }[];
  amountCandidates: { id: string; name: string }[];
  stages: {
    id: string;
    optionName: string;
    color: string | null;
    optionOrder: number;
    stageType: StageType;
    probability: number | null;
  }[];
};

type PipelineRange = { from?: string; to?: string };

export const getPipeline = async (
  moduleType: string,
  range: PipelineRange = {}
) => {
  const response = await axiosClient.get("/api/pipeline", {
    params: { moduleType, ...range },
  });

  return response.data as Pipeline;
};

export const getPipelineWinLoss = async (
  moduleType: string,
  range: PipelineRange = {}
) => {
  const response = await axiosClient.get("/api/pipeline/win-loss", {
    params: { moduleType, ...range },
  });

  return response.data as PipelineWinLoss;
};

export const getPipelineConfig = async (moduleType: string) => {
  const response = await axiosClient.get("/api/pipeline/config", {
    params: { moduleType },
  });

  return response.data as PipelineConfig;
};

export const setPipelineConfig = async (body: {
  moduleType: string;
  stageFieldId: string;
  amountFieldId?: string | null;
}) => {
  const response = await axiosClient.patch("/api/pipeline/config", body);

  return response.data as PipelineConfig;
};

export const updatePipelineStages = async (body: {
  moduleType: string;
  stages: {
    optionId: string;
    optionOrder: number;
    stageType: StageType;
    probability?: number | null;
  }[];
}) => {
  const response = await axiosClient.patch("/api/pipeline/stages", body);

  return response.data as PipelineConfig;
};
