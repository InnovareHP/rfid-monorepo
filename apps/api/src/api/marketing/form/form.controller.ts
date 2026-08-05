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
  EntitlementGuard,
  RequireFeature,
} from "../../../guard/entitlement/entitlement.guard";
import { SubscriptionGuard } from "../../../guard/subscription/subscription.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../../guard/permission/permission.guard";
import { CreateFormDto, UpdateFormDto } from "./dto/form.dto";
import { FormService } from "./form.service";

@Controller("marketing/forms")
@UseGuards(AuthGuard, SubscriptionGuard, PermissionGuard, EntitlementGuard)
export class FormController {
  constructor(private readonly formService: FormService) {}

  @RequirePermission({ outreach: ["read"] })
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

  @RequirePermission({ outreach: ["read"] })
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

  @RequirePermission({ outreach: ["read"] })
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

  @RequirePermission({ outreach: ["create"] })
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

  @RequirePermission({ outreach: ["update"] })
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

  @RequirePermission({ outreach: ["update"] })
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

  @RequirePermission({ outreach: ["delete"] })
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
