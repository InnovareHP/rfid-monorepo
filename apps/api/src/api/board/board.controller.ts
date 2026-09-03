import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
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
import {
  EntitlementGuard,
  RequireFeature,
} from "../../guard/entitlement/entitlement.guard";
import { HipaaGuard } from "../../guard/hipaa/hipaa.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import { Queue } from "bullmq";
import { memoryStorage } from "multer";
import { EldonFaxError } from "../../lib/eldonfax/eldonfax";
import { createOAuthState } from "../../lib/auth/oauth-state";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { toSafeError } from "../../lib/errors/safe-error";
import { BoardService } from "./board.service";
import {
  BulkEmailDto,
  CompleteActivityDto,
  CreateActivityDto,
  CreateRecordAttachmentDto,
  CreateColumnDto,
  CreateFaxActivityDto,
  CreateFieldOptionDto,
  CreateRecordDto,
  CsvImportDto,
  DeleteRecordsDto,
  RecordLinkCountsDto,
  NotificationStateDto,
  RestoreHistoryDto,
  UpdateActivityDto,
  UpdateContactDto,
  UpdateRecordValueDto,
} from "./dto/board.schema";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import { GmailService } from "./gmail.service";
import { OutlookService } from "./outlook.service";

@Controller("boards")
@UseGuards(
  AuthGuard,
  SubscriptionGuard,
  PermissionGuard,
  EntitlementGuard,
  HipaaGuard
)
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

  // ─── GET ──────────────────────────────────────────────────────────────

  @RequirePermission({ record: ["read"] })
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
      throw toSafeError(error, "boards.getAllRecords");
    }
  }

  @RequirePermission({ outreach: ["read"] })
  @Get("/gmail/auth-url")
  async getGmailAuthUrl(@Session() session: AuthenticatedSession) {
    try {
      const state = await createOAuthState("gmail", {
        userId: session.user.id,
        orgId: session.session.activeOrganizationId,
      });
      const url = this.gmailService.getAuthUrl(state);
      return { url };
    } catch (error) {
      throw toSafeError(error, "boards.getGmailAuthUrl");
    }
  }

  @RequirePermission({ outreach: ["read"] })
  @Get("/gmail/status")
  async getGmailStatus(@Session() session: AuthenticatedSession) {
    try {
      return await this.gmailService.getConnectionStatus(session.user.id);
    } catch (error) {
      throw toSafeError(error, "boards.getGmailStatus");
    }
  }

  @RequirePermission({ outreach: ["read"] })
  @Get("/outlook/auth-url")
  async getOutlookAuthUrl(@Session() session: AuthenticatedSession) {
    try {
      const state = await createOAuthState("outlook", {
        userId: session.user.id,
        orgId: session.session.activeOrganizationId,
      });
      const url = this.outlookService.getAuthUrl(state);
      return { url };
    } catch (error) {
      throw toSafeError(error, "boards.getOutlookAuthUrl");
    }
  }

  @RequirePermission({ outreach: ["read"] })
  @Get("/outlook/status")
  async getOutlookStatus(@Session() session: AuthenticatedSession) {
    try {
      return await this.outlookService.getConnectionStatus(session.user.id);
    } catch (error) {
      throw toSafeError(error, "boards.getOutlookStatus");
    }
  }

  @RequirePermission({ record: ["read"] })
  @Get("/records")
  async getRecords(
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string,
    @Query("page") page = 1,
    @Query("limit") limit = 50,
    @Query("search") search?: string
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.boardService.getRecords(
        organizationId,
        moduleType || "LEAD",
        Number(page),
        Number(limit),
        search
      );
    } catch (error) {
      throw toSafeError(error, "boards.getRecords");
    }
  }

  @RequirePermission({ record: ["read"] })
  @Get("/stats")
  async getBoardStats(
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.boardService.getBoardStats(
        organizationId,
        moduleType || "LEAD"
      );
    } catch (error) {
      throw toSafeError(error, "boards.getBoardStats");
    }
  }

  @RequirePermission({ record: ["read"] })
  @Get("/duplicates")
  async findDuplicates(
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string,
    @Query("email") email?: string,
    @Query("phone") phone?: string,
    @Query("excludeRecordId") excludeRecordId?: string,
    @Query("recordName") recordName?: string
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.boardService.findDuplicateRecords(
        organizationId,
        moduleType || "CONTACT",
        email,
        phone,
        excludeRecordId,
        recordName
      );
    } catch (error) {
      throw toSafeError(error, "boards.findDuplicates");
    }
  }

  @RequirePermission({ record: ["read"] })
  @Get("/column")
  async getColumns(
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.boardService.getColumns(
        organizationId,
        moduleType || "LEAD"
      );
    } catch (error) {
      throw toSafeError(error, "boards.getColumns");
    }
  }

  @RequirePermission({ report: ["read"] })
  @Get("/history")
  async getAllRecordHistory(
    @Query("page") page = 1,
    @Query("limit") limit = 50,
    @Session()
    session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("userId") userId?: string,
    @Query("column") column?: string
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      return await this.boardService.getAllRecordHistory(organizationId, {
        page: Number(page),
        limit: Number(limit),
        moduleType: moduleType || "LEAD",
        dateFrom,
        dateTo,
        userId,
        column,
      });
    } catch (error) {
      throw toSafeError(error, "boards.getAllRecordHistory");
    }
  }

  @RequirePermission({ report: ["read"] })
  @Get("/history/meta")
  async getRecordHistoryMeta(
    @Session()
    session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      return await this.boardService.getRecordHistoryMeta(
        organizationId,
        moduleType || "LEAD"
      );
    } catch (error) {
      throw toSafeError(error, "boards.getRecordHistoryMeta");
    }
  }

  @RequirePermission({ record: ["read"] })
  @Get("/contact-info/:fieldId")
  async getValueIdContact(
    @Param("fieldId") fieldId: string,
    @Query("value") value: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.getValueId(
        fieldId,
        value,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw toSafeError(error, "boards.getValueIdContact");
    }
  }

  @RequirePermission({ log: ["read"] })
  @Get("/timeline/:recordId")
  async getRecordHistory(
    @Param("recordId") recordId: string,
    @Query("take") take: number = 15,
    @Query("skip") skip: number = 1,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      const offset = (skip - 1) * take;
      return this.boardService.getHistory(
        recordId,
        Number(take),
        Number(offset),
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw toSafeError(error, "boards.getRecordHistory");
    }
  }

  @RequirePermission({ record: ["read"] })
  @Get("/field/:fieldId/options")
  async getRecordFieldOptions(
    @Param("fieldId") fieldId: string,
    @Session()
    session: AuthenticatedSession,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      return this.boardService.getRecordFieldOptions(
        fieldId,
        organizationId,
        page ? Number(page) : null,
        limit ? Number(limit) : null,
        search
      );
    } catch (error) {
      throw toSafeError(error, "boards.getRecordFieldOptions");
    }
  }

  @RequirePermission({ record: ["read"] })
  @Get("/jobs/:jobId/status")
  async getJobStatus(
    @Param("jobId") jobId: string,
    @Query("queue") queueName: string,
    @Session() session: AuthenticatedSession
  ) {
    return await this.boardService.getJobStatus(
      jobId,
      queueName,
      session.session.activeOrganizationId
    );
  }

  @RequirePermission({ record: ["read"] })
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
      throw toSafeError(error, "boards.getRecordById");
    }
  }

  @RequirePermission({ record: ["read"] })
  @Get("/:recordId/attachments/:fieldId")
  async getRecordAttachments(
    @Param("recordId") recordId: string,
    @Param("fieldId") fieldId: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.getFieldAttachments(
        recordId,
        fieldId,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw toSafeError(error, "boards.getRecordAttachments");
    }
  }

  @RequirePermission({ record: ["read"] })
  @Get("/:recordId/related")
  async getRelatedRecords(
    @Param("recordId") recordId: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.getRelatedRecords(
        recordId,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw toSafeError(error, "boards.getRelatedRecords");
    }
  }

  @RequirePermission({ log: ["read"] })
  @Get("/:recordId/activities")
  async getActivities(
    @Param("recordId") recordId: string,
    @Session() session: AuthenticatedSession,
    @Query("page") page = 1,
    @Query("limit") limit = 15,
    @Query("activityType") activityType?: string,
    @Query("status") status?: string
  ) {
    try {
      return await this.boardService.getActivities(
        recordId,
        session.session.activeOrganizationId,
        Number(page),
        Number(limit),
        activityType,
        status
      );
    } catch (error) {
      throw toSafeError(error, "boards.getActivities");
    }
  }

  @RequireFeature("ai")
  @RequirePermission({ log: ["read"] })
  @Get("/:recordId/suggestions")
  async getFollowUpSuggestions(
    @Param("recordId") recordId: string,
    @Query("force") force: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.getFollowUpSuggestions(
        recordId,
        session.session.activeOrganizationId,
        force === "true"
      );
    } catch (error) {
      throw toSafeError(error, "boards.getFollowUpSuggestions");
    }
  }

  @RequireFeature("ai")
  @RequirePermission({ analytics: ["read"] })
  @Get("/:recordId/analyze")
  async getRecordAnalyze(
    @Param("recordId") recordId: string,
    @Query("dateStart") dateStart: string,
    @Query("dateEnd") dateEnd: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      const dateStartDate = dateStart ? new Date(dateStart) : undefined;
      const dateEndDate = dateEnd ? new Date(dateEnd) : undefined;
      return await this.boardService.getRecordAnalyze(
        recordId,
        session.session.activeOrganizationId,
        dateStartDate,
        dateEndDate
      );
    } catch (error) {
      throw toSafeError(error, "boards.getRecordAnalyze");
    }
  }

  @RequirePermission({ record: ["create"] })
  @Post()
  async createRecord(
    @Body() dto: CreateRecordDto,
    @Session()
    session: AuthenticatedSession
  ) {
    const organizationId = session.session.activeOrganizationId;

    try {
      // Routed on the payload, not on a list of module keys: every custom
      // module fell through to the single-record path, which reads recordName
      // and initialValues that a rows request does not send.
      if (dto.data?.length) {
        return this.boardService.createReferral(
          dto.data as { referral_name: string; [key: string]: any }[],
          organizationId,
          session.user.id,
          dto.moduleType
        );
      }

      if (!dto.recordName) {
        throw new BadRequestException("recordName is required");
      }

      return await this.boardService.createRecord(
        dto.recordName,
        organizationId,
        session.user.id,
        dto.moduleType || "LEAD",
        dto.initialValues,
        dto.personContact
      );
    } catch (error) {
      // A duplicate name is a 409, not a bad request. Without this the status
      // survived only because the call above was not awaited, so the rejection
      // escaped the catch by accident.
      if (error instanceof HttpException) throw error;
      throw toSafeError(error, "boards.createRecord");
    }
  }

  @Post("/scan-card")
  @RequirePermission({ record: ["create"] })
  @RequireFeature("ai")
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
      throw toSafeError(error, "boards.scanBusinessCard");
    }
  }

  @RequirePermission({ outreach: ["create"] })
  @Post("/bulk-email")
  async sendBulkEmail(
    @Body() dto: BulkEmailDto,
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string
  ) {
    try {
      return await this.boardService.sendBulkEmail(
        dto.recordIds,
        dto.emailSubject,
        dto.emailBody,
        session.session.activeOrganizationId,
        session.user.id,
        moduleType || "LEAD",
        dto.send_via
      );
    } catch (error) {
      throw toSafeError(error, "boards.sendBulkEmail");
    }
  }

  @RequirePermission({ log: ["create"] })
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
      throw toSafeError(error, "boards.createActivity");
    }
  }

  @Post("/activities/fax")
  @RequirePermission({ log: ["create"] })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    })
  )
  async createFaxActivity(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateFaxActivityDto,
    @Session() session: MemberSession
  ) {
    if (!file) {
      throw new BadRequestException(
        'No document uploaded. Use multipart/form-data with the "file" field.'
      );
    }

    try {
      return await this.boardService.createFaxActivity(
        {
          recordId: dto.recordId,
          title: dto.title,
          description: dto.description,
          faxNumber: dto.faxNumber,
          file: {
            buffer: file.buffer,
            filename: file.originalname,
            mimetype: file.mimetype,
          },
        },
        session.session.activeOrganizationId,
        session.session.userId,
        session.session.memberRole
      );
    } catch (error) {
      if (error instanceof EldonFaxError) {
        throw new HttpException(
          { message: error.message, code: error.code },
          error.status
        );
      }
      throw toSafeError(error, "boards.createFaxActivity");
    }
  }

  @RequirePermission({ record: ["update"] })
  @Post("/:recordId/attachments")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    })
  )
  async uploadAttachment(
    @Param("recordId") recordId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateRecordAttachmentDto,
    @Session() session: AuthenticatedSession
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Use multipart/form-data with the "file" field.'
      );
    }
    try {
      return await this.boardService.uploadAttachment(
        recordId,
        dto.fieldId,
        file,
        session.session.activeOrganizationId,
        session.session.userId,
        dto.moduleType
      );
    } catch (error) {
      throw toSafeError(error, "boards.uploadAttachment");
    }
  }

  @RequirePermission({ log: ["update"] })
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
      throw toSafeError(error, "boards.completeActivity");
    }
  }

  @RequirePermission({ record: ["update"] })
  @Post("/restore-history")
  async restoreRecord(
    @Body() dto: RestoreHistoryDto,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.restoreRecord(
        dto.recordId,
        dto.history_id,
        session.session.activeOrganizationId,
        dto.event_type,
        session.user.id,
        dto.moduleType
      );
    } catch (error) {
      throw toSafeError(error, "boards.restoreRecord");
    }
  }

  @Post("/notification-state")
  async setRecordNotificationState(
    @Body() dto: NotificationStateDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return this.boardService.setRecordNotificationState(
        dto.recordId,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw toSafeError(error, "boards.setRecordNotificationState");
    }
  }

  @RequireFeature("export")
  @Post("/csv-import")
  @RequirePermission({ record: ["import"] })
  async createRecordDataFromCSV(
    @Session()
    session: AuthenticatedSession,
    @Body() dto: CsvImportDto
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.boardService.createRecordDataFromCSV(
        dto.excelData,
        organizationId,
        dto.moduleType,
        session.user.id,
        dto.columnMap,
        dto.nameColumn,
        dto.newColumns
      );
    } catch (error) {
      throw toSafeError(error, "boards.createRecordDataFromCSV");
    }
  }

  @RequirePermission({ field: ["create"] })
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
        dto.fieldType,
        dto.moduleType,
        organizationId
      );
    } catch (error) {
      throw toSafeError(error, "boards.createColumn");
    }
  }

  @RequirePermission({ field: ["update"] })
  @Post("/field/:fieldId/options")
  async createRecordFieldOption(
    @Param("fieldId") fieldId: string,
    @Body() dto: CreateFieldOptionDto,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.createRecordFieldOption(
        fieldId,
        dto.optionName,
        session.session.activeOrganizationId,
        session.session.userId,
        dto.color
      );
    } catch (error) {
      throw toSafeError(error, "boards.createRecordFieldOption");
    }
  }

  @RequirePermission({ log: ["update"] })
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
        session.user.id,
        dto
      );
    } catch (error) {
      throw toSafeError(error, "boards.updateActivity");
    }
  }

  @RequirePermission({ record: ["update"] })
  @Patch("/contact-form/:fieldId")
  async updateContactValue(
    @Param("fieldId") fieldId: string,
    @Body() dto: UpdateContactDto,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.updateContactValue(
        fieldId,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw toSafeError(error, "boards.updateContactValue");
    }
  }

  @RequirePermission({ log: ["update"] })
  @Patch("/timeline/:recordId")
  async updateRecordHistory(
    @Param("recordId") recordId: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.updateRecordHistory(
        recordId,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw toSafeError(error, "boards.updateRecordHistory");
    }
  }

  @RequirePermission({ record: ["update"] })
  @Patch("/:recordId")
  async updateRecordValue(
    @Param("recordId") recordId: string,
    @Body() dto: UpdateRecordValueDto,
    @Session()
    session: AuthenticatedSession
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.boardService.updateRecordValue(
        recordId,
        dto.fieldId,
        dto.value,
        organizationId,
        session.session.userId,
        dto.moduleType,
        dto.reason
      );
    } catch (error) {
      throw toSafeError(error, "boards.updateRecordValue");
    }
  }

  // Warning only: the delete itself never refuses on a link.
  @RequirePermission({ record: ["delete"] })
  @Post("/link-counts")
  async getRecordLinkCounts(
    @Body() dto: RecordLinkCountsDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.getRecordLinkCounts(
        dto.recordIds,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw toSafeError(error, "boards.getRecordLinkCounts");
    }
  }

  // ─── DELETE ───────────────────────────────────────────────────────────

  @RequirePermission({ record: ["delete"] })
  @Delete()
  async deleteRecords(
    @Body() dto: DeleteRecordsDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.deleteRecord(
        dto.column_ids,
        session.session.activeOrganizationId,
        session.session.userId,
        dto.moduleType
      );
    } catch (error) {
      throw toSafeError(error, "boards.deleteRecords");
    }
  }

  @RequirePermission({ outreach: ["update"] })
  @Delete("/gmail/disconnect")
  async disconnectGmail(@Session() session: AuthenticatedSession) {
    try {
      await this.gmailService.disconnect(session.user.id);
      return { message: "Gmail disconnected successfully" };
    } catch (error) {
      throw toSafeError(error, "boards.disconnectGmail");
    }
  }

  @RequirePermission({ outreach: ["update"] })
  @Delete("/outlook/disconnect")
  async disconnectOutlook(@Session() session: AuthenticatedSession) {
    try {
      await this.outlookService.disconnect(session.user.id);
      return { message: "Outlook disconnected successfully" };
    } catch (error) {
      throw toSafeError(error, "boards.disconnectOutlook");
    }
  }

  @RequirePermission({ log: ["delete"] })
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
      throw toSafeError(error, "boards.deleteActivity");
    }
  }

  // Restoring is create, not configure: a role that can add a column and bin
  // one has to be able to put that column back, or its own delete is one-way.
  @RequirePermission({ field: ["create"] })
  @Get("/column/trash")
  async getDeletedColumns(
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string
  ) {
    try {
      return await this.boardService.getDeletedColumns(
        moduleType || "LEAD",
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw toSafeError(error, "boards.getDeletedColumns");
    }
  }

  @RequirePermission({ field: ["create"] })
  @Patch("/column/:columnId/restore")
  async restoreColumn(
    @Param("columnId") columnId: string,
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string
  ) {
    try {
      return await this.boardService.restoreColumn(
        columnId,
        session.session.activeOrganizationId,
        moduleType || "LEAD"
      );
    } catch (error) {
      throw toSafeError(error, "boards.restoreColumn");
    }
  }

  @RequirePermission({ field: ["delete"] })
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
        moduleType || "LEAD",
        session.session.userId
      );
    } catch (error) {
      throw toSafeError(error, "boards.deleteColumn");
    }
  }

  @RequirePermission({ record: ["update"] })
  @Delete("/attachments/:attachmentId")
  async deleteAttachment(
    @Param("attachmentId") attachmentId: string,
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string
  ) {
    try {
      return await this.boardService.deleteAttachment(
        attachmentId,
        session.session.activeOrganizationId,
        moduleType || "LEAD"
      );
    } catch (error) {
      throw toSafeError(error, "boards.deleteAttachment");
    }
  }

  @RequirePermission({ log: ["delete"] })
  @Delete("/timeline/:recordId")
  async deleteRecordHistory(
    @Param("recordId") recordId: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.deleteRecordHistory(
        recordId,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw toSafeError(error, "boards.deleteRecordHistory");
    }
  }

  // configure, not delete: every role can edit a field's values, but binning an
  // option changes the pipeline itself, so it stays with owners and admins.
  @RequirePermission({ field: ["configure"] })
  @Delete("/field/options/:optionId")
  async deleteRecordFieldOption(
    @Param("optionId") optionId: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.deleteRecordFieldOption(
        optionId,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw toSafeError(error, "boards.deleteRecordFieldOption");
    }
  }

  @RequirePermission({ field: ["configure"] })
  @Get("/field/options/:optionId/usage")
  async getRecordFieldOptionUsage(
    @Param("optionId") optionId: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.getRecordFieldOptionUsage(
        optionId,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw toSafeError(error, "boards.getRecordFieldOptionUsage");
    }
  }

  @RequirePermission({ field: ["configure"] })
  @Get("/field/:fieldId/options/trash")
  async getDeletedRecordFieldOptions(
    @Param("fieldId") fieldId: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.getDeletedRecordFieldOptions(
        fieldId,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw toSafeError(error, "boards.getDeletedRecordFieldOptions");
    }
  }

  @RequirePermission({ field: ["configure"] })
  @Patch("/field/options/:optionId/restore")
  async restoreRecordFieldOption(
    @Param("optionId") optionId: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.restoreRecordFieldOption(
        optionId,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw toSafeError(error, "boards.restoreRecordFieldOption");
    }
  }
}
