import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  Param,
} from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { CrossTenant } from "../../../filter/tenant-context";
import { LandingPageService } from "./landing-page.service";

@Controller("marketing/public/pages")
@CrossTenant()
@AllowAnonymous()
export class LandingPagePublicController {
  constructor(private readonly landingPageService: LandingPageService) {}

  @Get("/:slug")
  async getPublicPage(@Param("slug") slug: string) {
    try {
      return await this.landingPageService.getPublicPage(slug);
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
