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
import { StripeGuard } from "src/guard/stripe/stripe.guard";
import {
  CreateExpenseDto,
  CreateMarketingDto,
  CreateMillageDto,
  UpdateExpenseDto,
  UpdateMarketingDto,
  UpdateMillageDto,
} from "./dto/liason.schema";
import { LiasonService } from "./liason.service";

@Controller("liason")
@UseGuards(AuthGuard)
@UseGuards(StripeGuard)
export class LiasonController {
  constructor(private readonly liasonService: LiasonService) {}

  @Post("mileage")
  async createMillage(
    @Body() createMillageDto: CreateMillageDto,
    @Session()
    session: MemberSession
  ) {
    try {
      return await this.liasonService.createMillage(
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

      const isOwner = session.session.memberRole === "owner";

      return await this.liasonService.getMillage(
        isOwner ? null : session.session.memberId,
        filters
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("mileage/:id")
  async getMillageById(@Param("id") id: string) {
    try {
      return await this.liasonService.getMillageById(id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("mileage/:id")
  async updateMillage(
    @Param("id") id: string,
    @Body() updateMillageDto: UpdateMillageDto
  ) {
    try {
      return await this.liasonService.updateMillage(id, updateMillageDto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("mileage/:id")
  async deleteMillage(@Param("id") id: string) {
    try {
      return await this.liasonService.deleteMillage(id);
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
      return await this.liasonService.createMarketing(
        createMarketingDto,
        session.session.memberId,
        session.session.userId
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

      const isOwner = session.session.memberRole === "owner";
      const memberId = isOwner ? null : session.session.memberId;
      const filters = {
        filter,
        page: Number(page),
        limit: Number(limit),
      };

      return await this.liasonService.getMarketing(memberId, filters);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("marketing/:id")
  async getMarketingById(@Param("id") id: string) {
    try {
      return await this.liasonService.getMarketingById(id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("marketing/:id")
  async updateMarketing(
    @Param("id") id: string,
    @Body() updateMarketingDto: UpdateMarketingDto
  ) {
    try {
      return await this.liasonService.updateMarketing(id, updateMarketingDto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("marketing/:id")
  async deleteMarketing(@Param("id") id: string) {
    try {
      return await this.liasonService.deleteMarketing(id);
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
      return await this.liasonService.createExpense(
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
      const isOwner = session.session.memberRole === "owner";
      return await this.liasonService.getExpense(
        isOwner ? null : session.session.memberId,
        filters
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

      const isOwner = session.session.memberRole === "owner";
      const pdfBuffer = await this.liasonService.getExpenseExport(
        isOwner ? null : session.session.memberId,
        filters
      );

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
    @Body() updateExpenseDto: UpdateExpenseDto
  ) {
    try {
      return await this.liasonService.updateExpense(id, updateExpenseDto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("expense/:id")
  async deleteExpense(@Param("id") id: string) {
    try {
      return await this.liasonService.deleteExpense(id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
