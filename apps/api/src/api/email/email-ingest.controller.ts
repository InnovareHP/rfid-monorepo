import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Logger,
  Post,
  Req,
} from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { Queue } from "bullmq";
import type { Request } from "express";
import { appConfig } from "../../config/app-config";
import { verifySnsMessage, type SnsMessage } from "../../lib/aws/sns-verify";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";

// SNS posts as text/plain, which express.json does not consume, so read the stream.
async function readBody(req: Request): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

@Controller("email")
@AllowAnonymous()
export class EmailIngestController {
  private readonly logger = new Logger(EmailIngestController.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL_INGEST) private readonly ingestQueue: Queue
  ) {}

  @Post("/inbound/sns")
  async handleInbound(@Req() req: Request) {
    const raw = req.body ? JSON.stringify(req.body) : await readBody(req);

    let message: SnsMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      throw new BadRequestException("Malformed SNS payload");
    }

    const valid = await verifySnsMessage(
      message,
      appConfig.SES_INBOUND_TOPIC_ARN
    );

    if (!valid) {
      this.logger.warn("Rejected SNS message with invalid signature");
      throw new ForbiddenException("Invalid SNS signature");
    }

    if (message.Type === "SubscriptionConfirmation" && message.SubscribeURL) {
      await fetch(message.SubscribeURL);
      return { confirmed: true };
    }

    if (message.Type !== "Notification") return { ignored: true };

    const ses = JSON.parse(message.Message);

    if (ses.notificationType !== "Received") return { ignored: true };

    const objectKey = ses.receipt?.action?.objectKey;

    if (!objectKey) {
      this.logger.warn("SES notification carried no S3 object key");
      return { ignored: true };
    }

    await this.ingestQueue.add("ingest", {
      objectKey,
      recipients: ses.receipt?.recipients ?? ses.mail?.destination ?? [],
    });

    return { queued: true };
  }
}
