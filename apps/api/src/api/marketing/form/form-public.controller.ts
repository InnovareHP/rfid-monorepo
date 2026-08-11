import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { CrossTenant } from "../../../filter/tenant-context";
import type { Request } from "express";
import {
  AutocompleteQueryDto,
  PlaceDetailsQueryDto,
} from "../../places/dto/places.schema";
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

  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get("/:slug/places/autocomplete")
  async autocompletePlaces(
    @Param("slug") slug: string,
    @Query() query: AutocompleteQueryDto
  ) {
    try {
      return await this.formService.autocompletePublicFormPlaces(
        slug,
        query.input
      );
    } catch (error) {
      throw this.toPublicError(error);
    }
  }

  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get("/:slug/places/details")
  async getPlaceDetails(
    @Param("slug") slug: string,
    @Query() query: PlaceDetailsQueryDto
  ) {
    try {
      return await this.formService.getPublicFormPlaceDetails(
        slug,
        query.placeId
      );
    } catch (error) {
      throw this.toPublicError(error);
    }
  }

  // Anonymous write that creates a lead record, so it gets the same ceiling as
  // the public booking write rather than the global 300/min.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
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
