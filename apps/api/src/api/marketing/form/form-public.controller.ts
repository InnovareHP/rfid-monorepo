import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { CrossTenant } from "../../../filter/tenant-context";
import type { Request } from "express";
import { PublicFormSubmitDto } from "./dto/form.dto";
import { FormService } from "./form.service";

@Controller("marketing/public/forms")
@CrossTenant()
@AllowAnonymous()
export class FormPublicController {
  constructor(private readonly formService: FormService) {}

  @Get("/:slug")
  async getPublicForm(@Param("slug") slug: string) {
    try {
      return await this.formService.getPublicForm(slug);
    } catch (error) {
      throw this.toPublicError(error);
    }
  }

  @Post("/:slug/submit")
  async submitPublicForm(
    @Param("slug") slug: string,
    @Body() dto: PublicFormSubmitDto,
    @Req() req: Request
  ) {
    try {
      return await this.formService.submitPublicForm(slug, dto.values, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
    } catch (error) {
      throw this.toPublicError(error);
    }
  }

  // Never let internal/Prisma error details reach an anonymous caller.
  private toPublicError(error: unknown): HttpException {
    if (error instanceof HttpException) return error;

    return new BadRequestException("Invalid request");
  }
}
