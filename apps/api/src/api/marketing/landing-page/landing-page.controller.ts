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
import {
  CreateLandingPageDto,
  UpdateLandingPageDto,
} from "./dto/landing-page.dto";
import { LandingPageService } from "./landing-page.service";

@Controller("marketing/landing-pages")
@UseGuards(AuthGuard)
export class LandingPageController {
  constructor(private readonly landingPageService: LandingPageService) {}

  @Get("/")
  async listLandingPages(@Session() session: AuthenticatedSession) {
    try {
      return await this.landingPageService.listLandingPages(
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/:id")
  async getLandingPage(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.landingPageService.getLandingPage(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/")
  async createLandingPage(
    @Body() dto: CreateLandingPageDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.landingPageService.createLandingPage(
        dto,
        session.session.activeOrganizationId,
        session.user.id
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/:id")
  async updateLandingPage(
    @Param("id") id: string,
    @Body() dto: UpdateLandingPageDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.landingPageService.updateLandingPage(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/:id/publish")
  async publishLandingPage(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.landingPageService.publishLandingPage(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/:id")
  async deleteLandingPage(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.landingPageService.deleteLandingPage(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
