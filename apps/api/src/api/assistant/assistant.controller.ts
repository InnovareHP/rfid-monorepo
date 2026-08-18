import { AssistantStreamEvent } from "@dashboard/shared";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { Response } from "express";
import { AssistantService } from "./assistant.service";
import { AskAssistantDto } from "./dto/assistant.schema";

@Controller("assistant")
@UseGuards(AuthGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post("/stream")
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  async stream(
    @Body() dto: AskAssistantDto,
    @Session() session: AuthenticatedSession,
    @Res() response: Response
  ) {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();

    const send = (event: AssistantStreamEvent) =>
      response.write(`data: ${JSON.stringify(event)}\n\n`);

    try {
      const events = this.assistantService.stream(dto, {
        userId: session.user.id,
        organizationId: session.session.activeOrganizationId,
        role: session.user.role,
      });

      for await (const event of events) {
        send(event);
      }
    } catch {
      // The client-facing error never carries the provider or model behind it.
      send({ type: "error" });
    } finally {
      response.end();
    }
  }

  @Get("/session/:sessionId")
  async history(
    @Param("sessionId") sessionId: string,
    @Session() session: AuthenticatedSession
  ) {
    return this.assistantService.getHistory(session.user.id, sessionId);
  }
}
