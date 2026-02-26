import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { gemini } from "../gemini/gemini";
import { cacheData } from "../redis/redis";
import { QUEUE_NAMES } from "./queue.constants";

export interface GeminiJobData {
  type: "follow-up-suggestions" | "analytics-summary" | "marketing-analysis";
  prompt: string;
  cacheKey?: string;
  cacheTtl?: number;
}

@Processor(QUEUE_NAMES.GEMINI)
export class GeminiProcessor extends WorkerHost {
  private readonly logger = new Logger(GeminiProcessor.name);

  async process(job: Job<GeminiJobData>) {
    this.logger.log(`Processing Gemini job ${job.id} — type: ${job.data.type}`);

    const { prompt, cacheKey, cacheTtl } = job.data;

    const result = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [prompt],
      config: { responseMimeType: "application/json" },
    });

    const parsed = JSON.parse(result.text ?? "");

    if (cacheKey && cacheTtl) {
      await cacheData(cacheKey, parsed, cacheTtl);
    }

    return parsed;
  }
}
