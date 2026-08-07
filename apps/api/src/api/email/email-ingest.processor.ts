import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Job } from "bullmq";
import { simpleParser } from "mailparser";
import { appConfig } from "../../config/app-config";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { s3 } from "../../lib/s3/s3";
import { EmailIngestService } from "./email-ingest.service";

export interface EmailIngestJobData {
  objectKey: string;
  recipients: string[];
}

@Processor(QUEUE_NAMES.EMAIL_INGEST)
export class EmailIngestProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailIngestProcessor.name);

  constructor(private readonly ingestService: EmailIngestService) {
    super();
  }

  async process(job: Job<EmailIngestJobData>) {
    if (!appConfig.SES_INBOUND_BUCKET) {
      throw new Error("SES_INBOUND_BUCKET is not configured");
    }

    const object = await s3.send(
      new GetObjectCommand({
        Bucket: appConfig.SES_INBOUND_BUCKET,
        Key: job.data.objectKey,
      })
    );

    const raw = await object.Body!.transformToByteArray();
    const parsed = await simpleParser(Buffer.from(raw));

    const from = parsed.from?.value[0];

    if (!from?.address) {
      this.logger.warn(`Inbound message ${job.data.objectKey} had no sender`);
      return { ingested: false };
    }

    const references = Array.isArray(parsed.references)
      ? parsed.references
      : parsed.references
        ? [parsed.references]
        : [];

    const ingested = await this.ingestService.ingest({
      from: from.address,
      fromName: from.name || null,
      recipients: job.data.recipients,
      subject: parsed.subject ?? "",
      text: parsed.text ?? "",
      messageId: parsed.messageId ?? null,
      inReplyTo: parsed.inReplyTo ?? null,
      references,
    });

    return { ingested };
  }
}
