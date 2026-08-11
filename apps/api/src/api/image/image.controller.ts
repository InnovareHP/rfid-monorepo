import { ROLES } from "@dashboard/shared";
import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Post,
  Query,
  Redirect,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { memoryStorage } from "multer";
import { EntitlementGuard } from "../../guard/entitlement/entitlement.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import {
  DeleteImageDto,
  UploadImageQueryDto,
  ViewImageQueryDto,
} from "./dto/image-schema";
import { SupportService } from "../support/support.service";
import { ImageService } from "./image.service";

// Org members share one prefix so any admin can clean up; support users get their own.
const scopeOf = (session: AuthenticatedSession) =>
  session.session.activeOrganizationId ?? session.user.id;

@Controller("image")
@UseGuards(AuthGuard, SubscriptionGuard, EntitlementGuard)
export class ImageController {
  constructor(
    private readonly imageService: ImageService,
    private readonly supportService: SupportService
  ) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("image", {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query() query: UploadImageQueryDto,
    @Session() session: AuthenticatedSession
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Use multipart/form-data and the "file" field name.'
      );
    }

    return await this.imageService.uploadImage(
      file,
      scopeOf(session),
      query.visibility
    );
  }

  @Get("view")
  @Redirect()
  async viewImage(
    @Query() query: ViewImageQueryDto,
    @Session() session: AuthenticatedSession
  ) {
    const scopeId = scopeOf(session);

    if (this.imageService.ownedBy(query.key, scopeId)) {
      return {
        url: await this.imageService.presign(query.key),
        statusCode: 302,
      };
    }

    // A support agent owns no part of a tenant's key, so the only cross-scope
    // read allowed is an attachment on a ticket that agent can already reach.
    const role = session.user.role;
    const isAgent = role === ROLES.SUPPORT || role === ROLES.SUPER_ADMIN;

    if (
      isAgent &&
      (await this.supportService.canReadAttachment(query.key, session.user))
    ) {
      return {
        url: await this.imageService.presign(query.key),
        statusCode: 302,
      };
    }

    throw new ForbiddenException("Image does not belong to this account");
  }

  @Delete()
  async deleteImage(
    @Query() dto: DeleteImageDto,
    @Session() session: AuthenticatedSession
  ) {
    return await this.imageService.deleteImage(dto.publicId, scopeOf(session));
  }
}
