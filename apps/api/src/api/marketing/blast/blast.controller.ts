import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import {
  EntitlementGuard,
  RequireFeature,
} from "../../../guard/entitlement/entitlement.guard";
import { HipaaGuard } from "../../../guard/hipaa/hipaa.guard";
import { SubscriptionGuard } from "../../../guard/subscription/subscription.guard";
import { Queue } from "bullmq";
import {
  PermissionGuard,
  RequirePermission,
} from "../../../guard/permission/permission.guard";
import { QUEUE_NAMES } from "../../../lib/queue/queue.constants";
import { BlastService } from "./blast.service";
import { CreateBlastDto, SendBlastDto, UpdateBlastDto } from "./dto/blast.dto";

@Controller("marketing/blasts")
@UseGuards(AuthGuard, SubscriptionGuard, PermissionGuard, EntitlementGuard, HipaaGuard)
export class BlastController {
  constructor(
    private readonly blastService: BlastService,
    @InjectQueue(QUEUE_NAMES.BLAST_SEND)
    private readonly blastSendQueue: Queue
  ) {}

  @RequirePermission({ outreach: ["read"] })
  @Get("/")
  async getBlasts(@Session() session: AuthenticatedSession) {
    try {
      return await this.blastService.getBlasts(
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["read"] })
  @Get("/jobs/:jobId/status")
  async getJobStatus(
    @Param("jobId") jobId: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      const job = await this.blastSendQueue.getJob(jobId);
      if (!job) {
        throw new BadRequestException("Job not found");
      }
      if (job.data?.organizationId !== session.session.activeOrganizationId) {
        // Don't reveal that a job exists in another org — 404 it the same
        // as a missing job.
        throw new NotFoundException("Job not found");
      }
      const state = await job.getState();
      return {
        jobId: job.id,
        status: state,
        progress: job.progress,
        result: job.returnvalue,
        failedReason: job.failedReason,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["read"] })
  @Get("/:id")
  async getBlast(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.blastService.getBlast(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["read"] })
  @Get("/:id/audience-count")
  async getAudienceCount(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.blastService.getAudienceCount(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["create"] })
  @Post("/")
  async createBlast(
    @Body() dto: CreateBlastDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.blastService.createBlast(
        dto,
        session.session.activeOrganizationId,
        session.user.id
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["update"] })
  @Patch("/:id")
  async updateBlast(
    @Param("id") id: string,
    @Body() dto: UpdateBlastDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.blastService.updateBlast(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/:id/send")
  @RequirePermission({ outreach: ["send"] })
  async sendBlast(
    @Param("id") id: string,
    @Body() dto: SendBlastDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.blastService.enqueueSend(
        id,
        session.session.activeOrganizationId,
        session.user.id,
        dto.sendVia
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["delete"] })
  @Delete("/:id")
  async deleteBlast(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.blastService.deleteBlast(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
