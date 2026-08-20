import { AssistantAction, AssistantStreamEvent } from "@dashboard/shared";
import { Injectable, Logger } from "@nestjs/common";
import { streamAgent } from "../../lib/ai/runtime";
import { AgentDefinition, AgentToolContext } from "../../lib/ai/types";
import { scrubPhi } from "../../lib/aws/ai-guard";
import {
  NO_ANSWER_TOKEN,
  supportAssistantPrompt,
  supportAssistantSystem,
} from "../../lib/aws/prompts";
import { AuditService } from "../../lib/audit/audit.service";
import { retrieveHelpChunks } from "./assistant-rag";
import { appendSessionTurns, getSessionTurns } from "./assistant-session";
import "./assistant-tools";
import { AskAssistantDto } from "./dto/assistant.schema";

// Older turns cost tokens and dilute the retrieved articles.
const MAX_HISTORY_TURNS = 10;

const AGENT: Omit<AgentDefinition, "system"> = {
  name: "support-assistant",
  tools: [
    "list_my_tickets",
    "get_ticket_status",
    "propose_contact_form",
    "propose_navigate",
  ],
  maxHops: 3,
  maxActions: 2,
  maxTokens: 512,
  temperature: 0.2,
};

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(private readonly auditService: AuditService) {}

  getHistory(userId: string, sessionId: string) {
    return getSessionTurns(userId, sessionId);
  }

  async *stream(
    dto: AskAssistantDto,
    ctx: AgentToolContext
  ): AsyncGenerator<AssistantStreamEvent> {
    const question = scrubPhi(dto.question).scrubbed;
    const stored = await getSessionTurns(ctx.userId, dto.sessionId);
    const history = stored.slice(-MAX_HISTORY_TURNS).map((turn) => ({
      role: turn.role,
      content: turn.content,
    }));

    const articles = await retrieveHelpChunks(question);
    const toolsUsed: string[] = [];
    let text = "";
    let actions: AssistantAction[] = [];

    const run = streamAgent(
      { ...AGENT, system: supportAssistantSystem(articles) },
      supportAssistantPrompt({ question, history }),
      ctx
    );

    for await (const event of run) {
      if (event.type === "token") {
        yield { type: "token", text: event.text };
        continue;
      }
      if (event.type === "reset") {
        yield { type: "reset" };
        continue;
      }
      if (event.type === "tool") {
        toolsUsed.push(event.name);
        yield { type: "step", tool: event.name };
        continue;
      }
      text = event.text;
      actions = event.actions;
    }

    const answer = sanitizeAnswer(text);
    const answered = Boolean(answer) && !answer.includes(NO_ANSWER_TOKEN);
    if (!answered) this.logger.log("assistant.no_answer");

    await appendSessionTurns(ctx.userId, dto.sessionId, [
      { role: "user", content: question },
      {
        role: "assistant",
        content: answered ? answer : "",
        actions,
      },
    ]);

    // The question itself is never logged; it is user prose and can carry PHI.
    await this.auditService.record({
      actorUserId: ctx.userId,
      actorOrgId: ctx.organizationId,
      actorRole: ctx.role,
      action: "assistant.query",
      resourceType: "assistant_session",
      resourceId: dto.sessionId,
      metadata: {
        answered,
        articles: articles.length,
        tools: toolsUsed,
        actions: actions.map((action) => action.kind),
      },
    });

    yield {
      type: "done",
      answered,
      answer: answered ? answer : null,
      actions,
    };
  }
}

// The model is told not to emit markup or links; this is the backstop.
function sanitizeAnswer(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
