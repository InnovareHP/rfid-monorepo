import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Session,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    @InjectQueue(QUEUE_NAMES.GEMINI)
    private readonly geminiQueue: Queue
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async getAllAnalytics(
    @Query("start") start: string,
    @Query("end") end: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      const startDate = start ? new Date(start) : undefined;
      const endDate = end ? new Date(end) : undefined;
      const organizationId = session.session.activeOrganizationId;

      return await this.analyticsService.getAllAnalytics(
        organizationId,
        startDate!,
        endDate!
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("summary")
  async getGeminiAnalytics(@Query("analytics") analytics: any) {
    try {
      return await this.analyticsService.getAnalyticsByGemini(analytics);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("jobs/:jobId/result")
  async getJobResult(@Param("jobId") jobId: string) {
    try {
      const job = await this.geminiQueue.getJob(jobId);
      if (!job) {
        throw new BadRequestException("Job not found");
      }
      const state = await job.getState();
      return {
        jobId: job.id,
        status: state,
        result: job.returnvalue,
        failedReason: job.failedReason,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("marketing")
  async getMarketingLeadAnalytics(
    @Query("start") start: string,
    @Query("end") end: string,
    @Query("userId") userId: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      const startDate = start ? new Date(start) : undefined;
      const endDate = end ? new Date(end) : undefined;

      const organizationId = session.session.activeOrganizationId;
      const userIdValue = userId ? userId : null;
      return await this.analyticsService.getMarketingLeadAnalytics(
        organizationId,
        startDate,
        endDate,
        userIdValue
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
