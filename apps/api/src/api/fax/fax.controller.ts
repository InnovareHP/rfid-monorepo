import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { memoryStorage } from "multer";
import { EldonFaxError, FAX_MAX_FILE_BYTES } from "../../lib/eldonfax/eldonfax";
import {
  ConnectFaxIntegrationDto,
  ListFaxesDto,
  SendFaxDto,
} from "./dto/fax-schema";
import { FaxService } from "./fax.service";

@Controller("fax")
@UseGuards(AuthGuard)
export class FaxController {
  constructor(private readonly faxService: FaxService) {}

  private actor(session: MemberSession) {
    return {
      userId: session.session.userId,
      orgId: session.session.activeOrganizationId,
      role: session.session.memberRole,
    };
  }

  private assertOwner(session: MemberSession) {
    if (session.session.memberRole !== "owner") {
      throw new ForbiddenException(
        "Only the organization owner can manage integrations"
      );
    }
  }

  @Get("integration")
  async integrationStatus(@Session() session: MemberSession) {
    return this.faxService.status(session.session.activeOrganizationId);
  }

  @Put("integration")
  async connectIntegration(
    @Body() dto: ConnectFaxIntegrationDto,
    @Session() session: MemberSession
  ) {
    this.assertOwner(session);
    try {
      return await this.faxService.connect(dto.apiKey, this.actor(session));
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Delete("integration")
  async disconnectIntegration(@Session() session: MemberSession) {
    this.assertOwner(session);
    return this.faxService.disconnect(this.actor(session));
  }

  @Post("send")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: FAX_MAX_FILE_BYTES },
    })
  )
  async sendFax(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SendFaxDto,
    @Session() session: MemberSession
  ) {
    if (!file) {
      throw new BadRequestException(
        'No document uploaded. Use multipart/form-data with the "file" field.'
      );
    }

    try {
      return await this.faxService.sendFax(
        dto.to,
        {
          buffer: file.buffer,
          filename: file.originalname,
          mimetype: file.mimetype,
        },
        this.actor(session)
      );
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get()
  async listFaxes(
    @Query() query: ListFaxesDto,
    @Session() session: MemberSession
  ) {
    try {
      return await this.faxService.listFaxes(
        session.session.activeOrganizationId,
        query.page,
        query.limit
      );
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(":id")
  async getFax(@Param("id") id: string, @Session() session: MemberSession) {
    try {
      return await this.faxService.getFax(
        session.session.activeOrganizationId,
        id
      );
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof EldonFaxError) {
      return new HttpException(
        { message: error.message, code: error.code },
        error.status
      );
    }
    if (error instanceof HttpException) return error;
    return new BadRequestException((error as Error).message);
  }
}
