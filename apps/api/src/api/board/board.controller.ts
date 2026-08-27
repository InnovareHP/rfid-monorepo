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
  Put,
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
import { BoardService } from "./board.service";
import {
  BulkEmailDto,
  CompleteActivityDto,
  CreateActivityDto,
  CreateAttachmentDto,
  CreateColumnDto,
  CreateFaxActivityDto,
  CreateFieldOptionDto,
  CreateRecordCountyAssignmentDto,
  CreateRecordDto,
  CsvImportDto,
  DeleteRecordsDto,
  NotificationStateDto,
  RestoreHistoryDto,
  UpdateActivityDto,
  UpdateContactDto,
  UpdateRecordCountyLiaisonDto,
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["read"] })
  @Get("/gmail/status")
  async getGmailStatus(@Session() session: AuthenticatedSession) {
    try {
      return await this.gmailService.getConnectionStatus(session.user.id);
    } catch (error) {
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["read"] })
  @Get("/outlook/status")
  async getOutlookStatus(@Session() session: AuthenticatedSession) {
    try {
      return await this.outlookService.getConnectionStatus(session.user.id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ record: ["read"] })
  @Get("/records")
  async getRecords(
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string,
    @Query("page") page = 1,
    @Query("limit") limit = 50
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.boardService.getRecords(
        organizationId,
        moduleType || "LEAD",
        Number(page),
        Number(limit)
      );
    } catch (error) {
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ record: ["read"] })
  @Get("/duplicates")
  async findDuplicates(
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string,
    @Query("email") email?: string,
    @Query("phone") phone?: string,
    @Query("excludeRecordId") excludeRecordId?: string
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.boardService.findDuplicateRecords(
        organizationId,
        moduleType || "CONTACT",
        email,
        phone,
        excludeRecordId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ record: ["read"] })
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ record: ["read"] })
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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

      return this.boardService.createRecord(
        dto.recordName,
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
    @Body() dto: CreateAttachmentDto,
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
      return this.boardService.restoreRecord(
        dto.recordId,
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
        dto.recordId,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ record: ["update"] })
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
        dto.liaisons
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ record: ["update"] })
  @Put("/county/assignment/:countyId")
  async updateCountyLiaisons(
    @Param("countyId") countyId: string,
    @Body() dto: UpdateRecordCountyLiaisonDto,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.updateCountyLiaisons(
        countyId,
        session.session.activeOrganizationId,
        dto.liaisons
      );
    } catch (error) {
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
        dto.color
      );
    } catch (error) {
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["update"] })
  @Delete("/gmail/disconnect")
  async disconnectGmail(@Session() session: AuthenticatedSession) {
    try {
      await this.gmailService.disconnect(session.user.id);
      return { message: "Gmail disconnected successfully" };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["update"] })
  @Delete("/outlook/disconnect")
  async disconnectOutlook(@Session() session: AuthenticatedSession) {
    try {
      await this.outlookService.disconnect(session.user.id);
      return { message: "Outlook disconnected successfully" };
    } catch (error) {
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
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
        moduleType || "LEAD"
      );
    } catch (error) {
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ record: ["update"] })
  @Delete("/county/assignment/:countyId")
  async deleteCountyAssignment(
    @Param("countyId") countyId: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.deleteCountyAssignment(
        countyId,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
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
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ field: ["delete"] })
  @Delete("/field/options/:optionId")
  async deleteRecordFieldOption(
    @Param("optionId") optionId: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.boardService.deleteRecordFieldOption(
        optionId,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
