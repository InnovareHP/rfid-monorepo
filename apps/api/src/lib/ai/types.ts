import { AssistantAction } from "@dashboard/shared";
import { z } from "zod";
import { ConverseTool } from "../aws/bedrock";

// Always taken from the session; a tool that trusts model-supplied ids is a cross-tenant read.
export type AgentToolContext = {
  userId: string;
  organizationId: string | null;
  role: string;
};

// There is deliberately no "act" — the model never performs an irreversible operation.
export type ToolKind = "read" | "propose";

export type ToolOutcome = { result: string; action?: AssistantAction };

export type AgentTool<TInput = unknown> = {
  name: string;
  // Say WHEN to call it, not just what it does; trigger conditions improve selection.
  description: string;
  kind: ToolKind;
  schema: z.ZodType<TInput>;
  jsonSchema: ConverseTool["schema"];
  handler: (input: TInput, ctx: AgentToolContext) => Promise<ToolOutcome>;
};

export type AgentDefinition = {
  name: string;
  system: string;
  // Tool names, resolved against the registry at run time.
  tools: string[];
  maxHops: number;
  maxActions: number;
  maxTokens: number;
  temperature: number;
};

// Keeps each handler's real input type at the definition site while the registry stays heterogeneous.
export function defineTool<TInput>(tool: AgentTool<TInput>): AgentTool {
  return tool as unknown as AgentTool;
}
