// src/api/lead/lead.controller.ts
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
import { FieldType } from "@prisma/client";
import { AuthGuard, Session, UserSession } from "@thallesp/nestjs-better-auth";
import { StripeGuard } from "src/guard/stripe/stripe.guard";
import { LeadService } from "./lead.service";

@Controller("leads")
@UseGuards(AuthGuard)
@UseGuards(StripeGuard)
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  async getAllLeads(
    @Session()
    session: UserSession & { session: { activeOrganizationId: string } },
    @Query("filter") filtersQuery: any,
    @Query("leadDateFrom") leadDateFrom?: string,
    @Query("leadDateTo") leadDateTo?: string,
    @Query("page") page = 1,
    @Query("limit") limit = 50,
    @Query("search") search?: string
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      const filter = filtersQuery ? JSON.parse(filtersQuery) : {};
      const filters = {
        filter: filter,
        leadDateFrom,
        leadDateTo,
        page: Number(page),
        limit: Number(limit),
        search,
      };

      return this.leadService.getAllLeads(organizationId, filters);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/history")
  async getAllLeadHistory(
    @Query("page") page = 1,
    @Query("limit") limit = 50,
    @Session()
    session: UserSession & { session: { activeOrganizationId: string } }
  ) {
    return this.leadService.getAllLeadHistory(
      session.session.activeOrganizationId,
      {
        page: Number(page),
        limit: Number(limit),
      }
    );
  }

  @Get("/:leadId")
  async getByLeadId(
    @Param("leadId") leadId: string,
    @Session()
    session: UserSession & { session: { activeOrganizationId: string } }
  ) {
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.leadService.getLeadById(leadId, organizationId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/:leadId/analyze")
  async getLeadAnalyze(
    @Param("leadId") leadId: string,
    @Query("dateStart") dateStart: string,
    @Query("dateEnd") dateEnd: string
  ) {
    try {
      const dateStartDate = dateStart ? new Date(dateStart) : undefined;
      const dateEndDate = dateEnd ? new Date(dateEnd) : undefined;
      return await this.leadService.getLeadAnalyze(
        leadId,
        dateStartDate,
        dateEndDate
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/timeline/:leadId")
  async getLeadHistory(
    @Param("leadId") leadId: string,
    @Query("take") take: number = 15,
    @Query("skip") skip: number = 1
  ) {
    try {
      const offset = (skip - 1) * take;
      return this.leadService.getLeadHistory(
        leadId,
        Number(take),
        Number(offset)
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/field/:fieldId/options")
  async getLeadFieldOptions(
    @Param("fieldId") fieldId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 50,
    @Session()
    session: UserSession & { session: { activeOrganizationId: string } }
  ) {
    try {
      const offset = (page - 1) * limit;
      const organizationId = session.session.activeOrganizationId;
      return this.leadService.getLeadFieldOptions(
        fieldId,
        organizationId,
        Number(offset),
        Number(limit)
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post()
  async createLead(
    @Body() body: { lead_name: string },
    @Session()
    session: UserSession & { session: { activeOrganizationId: string } }
  ) {
    const { lead_name } = body;
    const organizationId = session.session.activeOrganizationId;
    try {
      return this.leadService.createLead(
        lead_name,
        organizationId,
        session.user.id
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/restore-history")
  async restoreLead(
    @Body()
    body: {
      lead_id: string;
      history_id: string;
      event_type: string;
    },
    @Session()
    session: UserSession & { session: { activeOrganizationId: string } }
  ) {
    const { lead_id, history_id, event_type } = body;

    try {
      return this.leadService.restoreLead(
        lead_id,
        history_id,
        session.session.activeOrganizationId,
        event_type,
        session.user.id
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/notification-state")
  async setLeadNotificationState(@Body() body: { lead_id: string }) {
    const { lead_id } = body;

    try {
      return this.leadService.setLeadNotificationState(lead_id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/csv-import")
  async createLeadDataFromCSV(
    @Session()
    session: UserSession & { session: { activeOrganizationId: string } },
    @Body() body: { excelData: Record<string, any>[] }
  ) {
    const { excelData } = body;
    const organizationId = session.session.activeOrganizationId;
    try {
      await this.leadService.createLeadDataFromCSV(excelData, organizationId);
      return { message: "Lead data imported successfully" };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/column")
  async createColumn(
    @Session()
    session: UserSession & { session: { activeOrganizationId: string } },
    @Body() body: { column_name: string; lead_type: FieldType }
  ) {
    const { column_name, lead_type } = body;
    const organizationId = session.session.activeOrganizationId;
    try {
      return await this.leadService.createColumn(
        column_name,
        lead_type,
        organizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/location")
  async createLocation(
    @Body() body: { location_name: string; lead_id: string },
    @Session()
    session: UserSession & { session: { activeOrganizationId: string } }
  ) {
    try {
      const { location_name, lead_id } = body;
      const organizationId = session.session.activeOrganizationId;
      return this.leadService.createLocation(
        location_name,
        lead_id,
        organizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/field/:fieldId/options")
  async createLeadFieldOption(
    @Param("fieldId") fieldId: string,
    @Body() body: { option_name: string }
  ) {
    const { option_name } = body;
    try {
      return await this.leadService.createLeadFieldOption(fieldId, option_name);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/timeline/:leadId")
  async createLeadHistory(
    @Param("leadId") leadId: string,
    @Body() body: { old_value: string; new_value: string; created_by: string },
    @Session()
    session: UserSession & {
      session: { activeOrganizationId: string };
      member: { id: string };
    }
  ) {
    const { old_value, new_value, created_by } = body;
    try {
      return await this.leadService.createLeadHistory(
        leadId,
        old_value,
        new_value,
        created_by,
        session.member.id
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/timeline/:leadId")
  async updateLeadHistory(@Param("leadId") leadId: string) {
    try {
      return await this.leadService.updateLeadHistory(leadId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/:lead_id")
  async updateLeadValue(
    @Param("lead_id") lead_id: string,
    @Body() body: { value: string; field_id: string },
    @Session()
    session: UserSession & { session: { activeOrganizationId: string } }
  ) {
    const { value, field_id } = body;
    const organizationId = session.session.activeOrganizationId;

    try {
      return this.leadService.updateLeadValue(
        lead_id,
        field_id,
        value,
        organizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete()
  async deleteLeads(@Body() body: { column_ids: string[] }) {
    try {
      const { column_ids } = body;
      return await this.leadService.deleteLead(column_ids);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/timeline/:leadId")
  async deleteLead(@Param("leadId") leadId: string) {
    try {
      return await this.leadService.deleteLeadHistory(leadId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/field/options/:optionId")
  async deleteLeadFieldOption(@Param("optionId") optionId: string) {
    try {
      return await this.leadService.deleteLeadFieldOption(optionId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
