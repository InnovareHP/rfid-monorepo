import { Logger } from "@nestjs/common";
import { ConverseTool } from "../aws/bedrock";
import {
  AgentDefinition,
  AgentTool,
  AgentToolContext,
  ToolOutcome,
} from "./types";

const logger = new Logger("AgentRegistry");

const registry = new Map<string, AgentTool>();

export function registerTools(tools: AgentTool[]) {
  for (const tool of tools) {
    if (registry.has(tool.name)) {
      throw new Error(`Duplicate agent tool: ${tool.name}`);
    }
    registry.set(tool.name, tool);
  }
}

export function resetRegistry() {
  registry.clear();
}

export function resolveTools(names: string[]): ConverseTool[] {
  return names.flatMap((name) => {
    const tool = registry.get(name);
    if (!tool) return [];
    return [
      {
        name: tool.name,
        description: tool.description,
        schema: tool.jsonSchema,
      },
    ];
  });
}

// Never throws: one bad lookup returns text the model can read and move past.
export async function runTool(
  agent: AgentDefinition,
  name: string,
  input: unknown,
  ctx: AgentToolContext
): Promise<ToolOutcome> {
  if (!agent.tools.includes(name)) {
    return {
      result: `The tool "${name}" is not available. Answer without it.`,
    };
  }

  const tool = registry.get(name);
  if (!tool) {
    return { result: `The tool "${name}" does not exist. Answer without it.` };
  }

  const parsed = tool.schema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return {
      result: `Those arguments were not valid: ${issues}. Fix them or answer without this tool.`,
    };
  }

  try {
    return await tool.handler(parsed.data, ctx);
  } catch (error) {
    logger.error(
      `agent.tool_failed name=${name} message=${error instanceof Error ? error.message : "unknown"}`
    );
    return { result: `That lookup failed. Do not retry it.` };
  }
}
