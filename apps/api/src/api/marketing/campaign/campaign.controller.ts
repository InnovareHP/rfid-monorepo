import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { CampaignService } from "./campaign.service";
import { CreateCampaignDto, UpdateCampaignDto } from "./dto/campaign.dto";

@Controller("marketing/campaigns")
@UseGuards(AuthGuard)
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get("/")
  async getCampaigns(@Session() session: AuthenticatedSession) {
    try {
      return await this.campaignService.getCampaigns(
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/:id")
  async getCampaign(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.campaignService.getCampaign(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/")
  async createCampaign(
    @Body() dto: CreateCampaignDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.campaignService.createCampaign(
        dto,
        session.session.activeOrganizationId,
        session.user.id
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/:id")
  async updateCampaign(
    @Param("id") id: string,
    @Body() dto: UpdateCampaignDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.campaignService.updateCampaign(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/:id/archive")
  async archiveCampaign(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.campaignService.archiveCampaign(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/:id")
  async deleteCampaign(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.campaignService.deleteCampaign(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
