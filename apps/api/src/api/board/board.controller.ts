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
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { StripeGuard } from "src/guard/stripe/stripe.guard";
import { BoardService } from "./board.service";
import {
  CreateColumnDto,
  CreateFieldOptionDto,
  CreateHistoryDto,
  CreateRecordCountyAssignmentDto,
  CreateRecordDto,
  CsvImportDto,
  DeleteRecordsDto,
  NotificationStateDto,
  RestoreHistoryDto,
  UpdateRecordValueDto,
} from "./dto/board.schema";

@Controller("boards")
@UseGuards(AuthGuard)
@UseGuards(StripeGuard)
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

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
    @Query("moduleType") moduleType?: string
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
          session.user.id
        );
      }
      return this.boardService.createRecord(
        dto.record_name,
        organizationId,
        session.user.id,
        dto.moduleType || "LEAD"
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
        session.user.id
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
      await this.boardService.createRecordDataFromCSV(
        dto.excelData as Record<string, unknown>[],
        organizationId,
        dto.moduleType
      );
      return { message: "Lead data imported successfully" };
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
}
