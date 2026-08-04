import { isOrgAdmin } from "@dashboard/shared";
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
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { Response } from "express";
import { AuditService } from "../../lib/audit/audit.service";
import {
  CreateExpenseDto,
  CreateMarketingDto,
  CreateMillageDto,
  UpdateExpenseDto,
  UpdateMarketingDto,
  UpdateMillageDto,
} from "./dto/liaison.schema";
import { LiaisonService } from "./liaison.service";

@Controller("liaison")
@UseGuards(AuthGuard)
export class LiaisonController {
  constructor(
    private readonly liaisonService: LiaisonService,
    private readonly audit: AuditService
  ) {}

  @Post("mileage")
  async createMillage(
    @Body() createMillageDto: CreateMillageDto,
    @Session()
    session: MemberSession
  ) {
    try {
      return await this.liaisonService.createMillage(
        createMillageDto,
        session.session.memberId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("mileage")
  async getMillage(
    @Session()
    session: MemberSession,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("filter") filtersQuery: any
  ) {
    try {
      const filter = filtersQuery ? JSON.parse(filtersQuery) : {};
      const filters = {
        filter,
        page: Number(page),
        limit: Number(limit),
      };

      const isOwner = isOrgAdmin(session.session.memberRole);

      return await this.liaisonService.getMillage(
        isOwner ? null : session.session.memberId,
        filters,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("mileage/:id")
  async getMillageById(
    @Param("id") id: string,
    @Session()
    session: MemberSession
  ) {
    try {
      return await this.liaisonService.getMillageById(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("mileage/:id")
  async updateMillage(
    @Param("id") id: string,
    @Body() updateMillageDto: UpdateMillageDto,
    @Session()
    session: MemberSession
  ) {
    try {
      return await this.liaisonService.updateMillage(
        id,
        updateMillageDto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("mileage/:id")
  async deleteMillage(
    @Param("id") id: string,
    @Session()
    session: MemberSession
  ) {
    try {
      return await this.liaisonService.deleteMillage(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("marketing")
  async createMarketing(
    @Body() createMarketingDto: CreateMarketingDto,
    @Session()
    session: MemberSession
  ) {
    try {
      return await this.liaisonService.createMarketing(
        createMarketingDto,
        session.session.memberId,
        session.session.userId,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("marketing")
  async getMarketing(
    @Session()
    session: MemberSession,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("filter") filtersQuery: any
  ) {
    try {
      const filter = filtersQuery ? JSON.parse(filtersQuery) : {};

      const isOwner = isOrgAdmin(session.session.memberRole);
      const memberId = isOwner ? null : session.session.memberId;
      const filters = {
        filter,
        page: Number(page),
        limit: Number(limit),
      };

      return await this.liaisonService.getMarketing(
        memberId,
        filters,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("marketing/:id")
  async getMarketingById(
    @Param("id") id: string,
    @Session()
    session: MemberSession
  ) {
    try {
      return await this.liaisonService.getMarketingById(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("marketing/:id")
  async updateMarketing(
    @Param("id") id: string,
    @Body() updateMarketingDto: UpdateMarketingDto,
    @Session()
    session: MemberSession
  ) {
    try {
      return await this.liaisonService.updateMarketing(
        id,
        updateMarketingDto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("marketing/:id")
  async deleteMarketing(
    @Param("id") id: string,
    @Session()
    session: MemberSession
  ) {
    try {
      return await this.liaisonService.deleteMarketing(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("expense")
  async createExpense(
    @Body() createExpenseDto: CreateExpenseDto,
    @Session()
    session: MemberSession
  ) {
    try {
      return await this.liaisonService.createExpense(
        createExpenseDto,
        session.session.memberId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("expense")
  async getExpense(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("filter") filtersQuery: any,
    @Session()
    session: MemberSession
  ) {
    const filter = filtersQuery ? JSON.parse(filtersQuery) : {};
    const filters = {
      filter,
      page: Number(page),
      limit: Number(limit),
    };

    try {
      const isOwner = isOrgAdmin(session.session.memberRole);
      const organizationId = session.session.activeOrganizationId;
      return await this.liaisonService.getExpense(
        isOwner ? null : session.session.memberId,
        filters,
        organizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("expense/export")
  async getExpenseExport(
    @Session()
    session: MemberSession,
    @Query("filter") filtersQuery: any,
    @Res() res: Response
  ) {
    try {
      const filter = filtersQuery ? JSON.parse(filtersQuery) : {};

      const filters = {
        filter,
        page: 1,
        limit: 10000,
      };

      const isOwner = isOrgAdmin(session.session.memberRole);
      const organizationId = session.session.activeOrganizationId;
      const pdfBuffer = await this.liaisonService.getExpenseExport(
        isOwner ? null : session.session.memberId,
        filters,
        organizationId
      );

      await this.audit.record({
        actorUserId: session.session.userId ?? null,
        actorOrgId: organizationId,
        actorRole: session.session.memberRole ?? null,
        action: "expense.export",
        resourceType: "Expense",
        method: "GET",
        path: "/api/liaison/expense/export",
        metadata: { format: "pdf", filter },
      });

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="expense-report.pdf"`,
        "Content-Length": pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("expense/:id")
  async updateExpense(
    @Param("id") id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Session()
    session: MemberSession
  ) {
    try {
      return await this.liaisonService.updateExpense(
        id,
        updateExpenseDto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("expense/:id")
  async deleteExpense(
    @Param("id") id: string,
    @Session()
    session: MemberSession
  ) {
    try {
      return await this.liaisonService.deleteExpense(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
