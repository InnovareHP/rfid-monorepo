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
import { CreateFormDto, UpdateFormDto } from "./dto/form.dto";
import { FormService } from "./form.service";

@Controller("marketing/forms")
@UseGuards(AuthGuard)
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Get("/")
  async getForms(@Session() session: AuthenticatedSession) {
    try {
      return await this.formService.getForms(
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/:id")
  async getForm(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.formService.getForm(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/:id/fields")
  async getFormFields(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.formService.getFormFields(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/")
  async createForm(
    @Body() dto: CreateFormDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.formService.createForm(
        dto,
        session.session.activeOrganizationId,
        session.user.id
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/:id")
  async updateForm(
    @Param("id") id: string,
    @Body() dto: UpdateFormDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.formService.updateForm(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/:id/publish")
  async publishForm(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.formService.publishForm(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/:id")
  async deleteForm(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.formService.deleteForm(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
