import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { Queue } from "bullmq";
import { memoryStorage } from "multer";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { BoardService } from "./board.service";
import {
  BulkEmailDto,
  CompleteActivityDto,
  CreateActivityDto,
  CreateColumnDto,
  CreateFieldOptionDto,
  CreateHistoryDto,
  CreateRecordCountyAssignmentDto,
  CreateRecordDto,
  CsvImportDto,
  DeleteRecordsDto,
  NotificationStateDto,
  RestoreHistoryDto,
  UpdateActivityDto,
  UpdateContactDto,
  UpdateRecordValueDto,
} from "./dto/board.schema";
import { GmailService } from "./gmail.service";
import { OutlookService } from "./outlook.service";

@Controller("boards")
@UseGuards(AuthGuard)
// @UseGuards(StripeGuard)
export class BoardController {
  constructor(
    private readonly boardService: BoardService,
    private readonly gmailService: GmailService,
    private readonly outlookService: OutlookService,
    @InjectQueue(QUEUE_NAMES.BULK_EMAIL)
    private readonly bulkEmailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CSV_IMPORT)
    private readonly csvImportQueue: Queue,
    @InjectQueue(QUEUE_NAMES.GEMINI)
    private readonly geminiQueue: Queue
  ) {}

  @Get("/gmail/auth-url")
  async getGmailAuthUrl(@Session() session: AuthenticatedSession) {
    try {
      const state = JSON.stringify({
        userId: session.user.id,
        orgId: session.session.activeOrganizationId,
      });
      const url = this.gmailService.getAuthUrl(state);
      return { url };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/gmail/status")
  async getGmailStatus(@Session() session: AuthenticatedSession) {
    try {
      return await this.gmailService.getConnectionStatus(session.user.id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/gmail/disconnect")
  async disconnectGmail(@Session() session: AuthenticatedSession) {
    try {
      await this.gmailService.disconnect(session.user.id);
      return { message: "Gmail disconnected successfully" };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/outlook/auth-url")
  async getOutlookAuthUrl(@Session() session: AuthenticatedSession) {
    try {
      const state = JSON.stringify({
        userId: session.user.id,
        orgId: session.session.activeOrganizationId,
      });
      const url = this.outlookService.getAuthUrl(state);
      return { url };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/outlook/status")
  async getOutlookStatus(@Session() session: AuthenticatedSession) {
    try {
      return await this.outlookService.getConnectionStatus(session.user.id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/outlook/disconnect")
  async disconnectOutlook(@Session() session: AuthenticatedSession) {
    try {
      await this.outlookService.disconnect(session.user.id);
      return { message: "Outlook disconnected successfully" };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/scan-card")
  @UseInterceptors(
    FileInterceptor("image", {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  )
  async scanBusinessCard(
    @UploadedFile() file: Express.Multer.File,
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string
  ) {
    try {
      if (!file) {
        throw new BadRequestException("No image file uploaded");
      }
      return await this.boardService.scanBusinessCard(
        file,
        session.session.activeOrganizationId,
        moduleType || "LEAD"
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/bulk-email")
  async sendBulkEmail(
    @Body() dto: BulkEmailDto,
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string
  ) {
    try {
      return await this.boardService.sendBulkEmail(
        dto.record_ids,
        dto.email_subject,
        dto.email_body,
        session.session.activeOrganizationId,
        session.user.id,
        moduleType || "LEAD",
        dto.send_via
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/:recordId/activities")
  async getActivities(
    @Param("recordId") recordId: string,
    @Session() session: AuthenticatedSession,
    @Query("page") page = 1,
    @Query("limit") limit = 15
  ) {
    try {
      return await this.boardService.getActivities(
        recordId,
        session.session.activeOrganizationId,
        Number(page),
        Number(limit)
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/activities")
  async createActivity(
    @Body() dto: CreateActivityDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.createActivity(
        dto,
        session.session.activeOrganizationId,
        session.user.id
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/activities/:activityId/complete")
  async completeActivity(
    @Param("activityId") activityId: string,
    @Body() dto: CompleteActivityDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.completeActivity(
        activityId,
        session.session.activeOrganizationId,
        session.user.id,
        dto
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/activities/:activityId")
  async updateActivity(
    @Param("activityId") activityId: string,
    @Body() dto: UpdateActivityDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.updateActivity(
        activityId,
        session.session.activeOrganizationId,
        dto
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/activities/:activityId")
  async deleteActivity(
    @Param("activityId") activityId: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.deleteActivity(
        activityId,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/:recordId")
  async getRecordById(
    @Param("recordId") recordId: string,
    @Session()
    session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.boardService.getRecordById(
        recordId,
        organizationId,
        moduleType || "LEAD"
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/contact-info/:fieldId")
  async getValueIdContact(
    @Param("fieldId") fieldId: string,
    @Query("value") value: string
  ) {
    try {
      return await this.boardService.getValueId(fieldId, value);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/")
  async getAllRecords(
    @Session()
    session: AuthenticatedSession,
    @Query("filter") filtersQuery: string,
    @Query("boardDateFrom") boardDateFrom?: string,
    @Query("boardDateTo") boardDateTo?: string,
    @Query("page") page = 1,
    @Query("limit") limit = 50,
    @Query("search") search?: string,
    @Query("moduleType") moduleType?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: "asc" | "desc"
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      const filter = filtersQuery ? JSON.parse(filtersQuery) : {};
      const filters = {
        filter,
        boardDateFrom,
        boardDateTo,
        page: Number(page),
        limit: Number(limit),
        search,
        moduleType,
        sortBy,
        sortOrder,
      };

      return this.boardService.getAllBoards(organizationId, filters);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/history")
  async getAllRecordHistory(
    @Query("page") page = 1,
    @Query("limit") limit = 50,
    @Session()
    session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      return await this.boardService.getAllRecordHistory(organizationId, {
        page: Number(page),
        limit: Number(limit),
        moduleType: moduleType || "LEAD",
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/county/configuration")
  async getCountyConfiguration(
    @Session()
    session: AuthenticatedSession
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.boardService.getCountyConfiguration(organizationId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/:recordId/suggestions")
  async getFollowUpSuggestions(
    @Param("recordId") recordId: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.getFollowUpSuggestions(
        recordId,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/:recordId/analyze")
  async getRecordAnalyze(
    @Param("recordId") recordId: string,
    @Query("dateStart") dateStart: string,
    @Query("dateEnd") dateEnd: string
  ) {
    try {
      const dateStartDate = dateStart ? new Date(dateStart) : undefined;
      const dateEndDate = dateEnd ? new Date(dateEnd) : undefined;
      return await this.boardService.getRecordAnalyze(
        recordId,
        dateStartDate,
        dateEndDate
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/timeline/:recordId")
  async getRecordHistory(
    @Param("recordId") recordId: string,
    @Query("take") take: number = 15,
    @Query("skip") skip: number = 1
  ) {
    try {
      const offset = (skip - 1) * take;
      return this.boardService.getHistory(
        recordId,
        Number(take),
        Number(offset)
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/field/:fieldId/options")
  async getRecordFieldOptions(
    @Param("fieldId") fieldId: string,
    @Session()
    session: AuthenticatedSession,
    @Query("page") page?: number,
    @Query("limit") limit?: number
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      return this.boardService.getRecordFieldOptions(
        fieldId,
        organizationId,
        page ? Number(page) : null,
        limit ? Number(limit) : null
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post()
  async createRecord(
    @Body() dto: CreateRecordDto,
    @Session()
    session: AuthenticatedSession
  ) {
    const organizationId = session.session.activeOrganizationId;

    try {
      if (dto.moduleType === "REFERRAL") {
        return this.boardService.createReferral(
          dto.data,
          organizationId,
          session.user.id,
          dto.moduleType
        );
      }
      return this.boardService.createRecord(
        dto.record_name,
        organizationId,
        session.user.id,
        dto.moduleType || "LEAD",
        dto.initialValues,
        dto.personContact
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/restore-history")
  async restoreRecord(
    @Body() dto: RestoreHistoryDto,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return this.boardService.restoreRecord(
        dto.record_id,
        dto.history_id,
        session.session.activeOrganizationId,
        dto.event_type,
        session.user.id,
        dto.moduleType
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/notification-state")
  async setRecordNotificationState(
    @Body() dto: NotificationStateDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return this.boardService.setRecordNotificationState(
        dto.record_id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/county/assignment")
  async createRecordCountyAssignment(
    @Body() dto: CreateRecordCountyAssignmentDto,
    @Session()
    session: AuthenticatedSession
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.boardService.createCountyAssignment(
        dto.name,
        organizationId,
        dto.assigned_to
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/csv-import")
  async createRecordDataFromCSV(
    @Session()
    session: AuthenticatedSession,
    @Body() dto: CsvImportDto
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.boardService.createRecordDataFromCSV(
        dto.excelData as Record<string, unknown>[],
        organizationId,
        dto.moduleType
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/column")
  async createColumn(
    @Session()
    session: AuthenticatedSession,
    @Body() dto: CreateColumnDto
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.boardService.createColumn(
        dto.column_name,
        dto.field_type,
        dto.module_type,
        organizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/field/:fieldId/options")
  async createRecordFieldOption(
    @Param("fieldId") fieldId: string,
    @Body() dto: CreateFieldOptionDto
  ) {
    try {
      return await this.boardService.createRecordFieldOption(
        fieldId,
        dto.option_name
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/timeline/:recordId")
  async createRecordHistory(
    @Param("recordId") recordId: string,
    @Body() dto: CreateHistoryDto,
    @Session()
    session: MemberSession
  ) {
    try {
      return await this.boardService.createRecordHistory(
        recordId,
        dto.old_value,
        dto.new_value,
        dto.created_by,
        session.session.memberId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/contact-form/:fieldId")
  async updateContactValue(
    @Param("fieldId") fieldId: string,
    @Body() dto: UpdateContactDto
  ) {
    try {
      return await this.boardService.updateContactValue(fieldId, dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/timeline/:recordId")
  async updateRecordHistory(@Param("recordId") recordId: string) {
    try {
      return await this.boardService.updateRecordHistory(recordId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/:record_id")
  async updateRecordValue(
    @Param("record_id") record_id: string,
    @Body() dto: UpdateRecordValueDto,
    @Session()
    session: AuthenticatedSession
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return this.boardService.updateRecordValue(
        record_id,
        dto.field_id,
        dto.value,
        organizationId,
        session.session.userId,
        dto.moduleType,
        dto.reason
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete()
  async deleteRecords(
    @Body() dto: DeleteRecordsDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.deleteRecord(
        dto.column_ids,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/column/:columnId")
  async deleteColumn(
    @Param("columnId") columnId: string,
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string
  ) {
    try {
      return await this.boardService.deleteColumn(
        columnId,
        session.session.activeOrganizationId,
        moduleType || "LEAD"
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/county/assignment/:countyId")
  async deleteCountyAssignment(@Param("countyId") countyId: string) {
    try {
      return await this.boardService.deleteCountyAssignment(countyId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/timeline/:recordId")
  async deleteRecordHistory(@Param("recordId") recordId: string) {
    try {
      return await this.boardService.deleteRecordHistory(recordId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/field/options/:optionId")
  async deleteRecordFieldOption(@Param("optionId") optionId: string) {
    try {
      return await this.boardService.deleteRecordFieldOption(optionId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/jobs/:jobId/status")
  async getJobStatus(
    @Param("jobId") jobId: string,
    @Query("queue") queueName: string
  ) {
    try {
      const queue = this.getQueueByName(queueName);
      const job = await queue.getJob(jobId);
      if (!job) {
        throw new BadRequestException("Job not found");
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

  private getQueueByName(name: string): Queue {
    switch (name) {
      case QUEUE_NAMES.BULK_EMAIL:
        return this.bulkEmailQueue;
      case QUEUE_NAMES.CSV_IMPORT:
        return this.csvImportQueue;
      case QUEUE_NAMES.GEMINI:
        return this.geminiQueue;
      default:
        throw new BadRequestException(`Unknown queue: ${name}`);
    }
  }
}
