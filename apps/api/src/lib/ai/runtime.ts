import { AssistantAction } from "@dashboard/shared";
import { Logger } from "@nestjs/common";
import { ConverseTurn, converseStreamWithTools } from "../aws/bedrock";
import { resolveTools, runTool } from "./registry";
import { createStreamFilter } from "./stream-filter";
import { AgentDefinition, AgentToolContext } from "./types";

const logger = new Logger("AgentRuntime");

// Tool names only: the caller maps them to copy, so no product wording lives here.
export type AgentEvent =
  | { type: "token"; text: string }
  | { type: "tool"; name: string }
  | { type: "reset" }
  | { type: "done"; text: string; actions: AssistantAction[] };

// Small models narrate their working-out; that is not the answer.
export function stripThinking(text: string): string {
  return text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
}

export async function* streamAgent(
  agent: AgentDefinition,
  prompt: string,
  ctx: AgentToolContext
): AsyncGenerator<AgentEvent> {
  const tools = resolveTools(agent.tools);
  const messages: ConverseTurn[] = [
    { role: "user", content: [{ text: prompt }] },
  ];
  const actions: AssistantAction[] = [];
  let text = "";

  for (let hop = 0; hop < agent.maxHops; hop++) {
    const filter = createStreamFilter();
    const queue = createTokenQueue();
    // Deltas arrive in a callback, so the queue bridges them into this generator.
    const hopCall = converseStreamWithTools(
      messages,
      tools,
      {
        system: agent.system,
        maxTokens: agent.maxTokens,
        temperature: agent.temperature,
      },
      (delta) => {
        const safe = filter.push(delta);
        if (safe) queue.push(safe);
      }
    ).finally(() => {
      const tail = filter.flush();
      if (tail) queue.push(tail);
      queue.finish();
    });

    for await (const chunk of queue.drain()) {
      yield { type: "token", text: chunk };
    }

    const res = await hopCall;
    text = stripThinking(res.text);
    if (!res.toolCalls.length) {
      yield { type: "done", text, actions };
      return;
    }

    // This hop's text was preamble to a tool call, not the answer.
    yield { type: "reset" };
    for (const call of res.toolCalls) yield { type: "tool", name: call.name };

    messages.push(res.raw, {
      role: "user",
      content: await collectToolResults(agent, res.toolCalls, ctx, actions),
    });
  }

  logger.warn(`agent.hop_cap agent=${agent.name} hops=${agent.maxHops}`);
  yield { type: "done", text, actions };
}

function createTokenQueue() {
  const items: string[] = [];
  let wake: (() => void) | null = null;
  let finished = false;

  const release = () => {
    wake?.();
    wake = null;
  };

  return {
    push(text: string) {
      items.push(text);
      release();
    },
    finish() {
      finished = true;
      release();
    },
    async *drain(): AsyncGenerator<string> {
      for (;;) {
        while (items.length) yield items.shift() as string;
        if (finished) return;
        await new Promise<void>((resolve) => (wake = resolve));
      }
    },
  };
}

async function collectToolResults(
  agent: AgentDefinition,
  calls: { id: string; name: string; input: unknown }[],
  ctx: AgentToolContext,
  actions: AssistantAction[]
): Promise<ConverseTurn["content"]> {
  const results: ConverseTurn["content"] = [];
  for (const call of calls) {
    const outcome = await runTool(agent, call.name, call.input, ctx);
    if (outcome.action && actions.length < agent.maxActions) {
      actions.push(outcome.action);
    }
    results.push({
      toolResult: { toolUseId: call.id, content: [{ text: outcome.result }] },
    });
  }
  return results;
}
