import { ROLES } from "@dashboard/shared";
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
import { Priority, TicketCategory, TicketStatus } from "@prisma/client";
import { AuthGuard, Roles, Session } from "@thallesp/nestjs-better-auth";
import {
  CreateLiveChatAttachmentDto,
  CreateLiveChatDto,
  CreateLiveChatMessageDto,
  CreateTicketAttachmentDto,
  CreateTicketDto,
  CreateTicketMessageDto,
  UpdateTicketDto,
} from "./dto/support.schema";
import { SupportService } from "./support.service";

@Controller("support")
@UseGuards(AuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get("/tickets")
  @Roles([ROLES.SUPPORT, ROLES.USER])
  async getTickets(
    @Session() session: AuthenticatedSession,
    @Query("page") page: number = 1,
    @Query("take") take: number = 10,
    @Query("priority") priority: Priority = Priority.MEDIUM,
    @Query("status") status?: TicketStatus,
    @Query("category") category?: TicketCategory
  ) {
    try {
      return await this.supportService.getTickets(
        session.user,
        Number(take),
        Number(page),
        priority,
        status,
        category
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/tickets/:ticketId")
  @Roles([ROLES.SUPPORT, ROLES.USER])
  async getTicketById(
    @Param("ticketId") ticketId: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.supportService.getTicketById(ticketId, session.user.id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/tickets")
  @Roles([ROLES.USER])
  async createTicket(
    @Body() dto: CreateTicketDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.supportService.createTicket(session.user.id, dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/tickets/:ticketId")
  @Roles([ROLES.SUPPORT])
  async updateTicket(
    @Param("ticketId") ticketId: string,
    @Body() dto: UpdateTicketDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.supportService.updateTicket(
        ticketId,
        session.user.id,
        dto
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/tickets/:ticketId")
  @Roles([ROLES.SUPPORT])
  async deleteTicket(
    @Param("ticketId") ticketId: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.supportService.deleteTicket(ticketId, session.user.id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/tickets/:ticketId/messages")
  @Roles([ROLES.SUPPORT, ROLES.USER])
  async createTicketMessage(
    @Param("ticketId") ticketId: string,
    @Body() dto: CreateTicketMessageDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.supportService.createTicketMessage(
        ticketId,
        session.user.id,
        dto.message
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/tickets/:ticketId/messages/:messageId/attachments")
  @Roles([ROLES.SUPPORT, ROLES.USER])
  async createTicketAttachment(
    @Param("messageId") messageId: string,
    @Body() dto: CreateTicketAttachmentDto
  ) {
    try {
      return await this.supportService.createTicketAttachment(
        messageId,
        dto.imageUrl
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/live-chats")
  @Roles([ROLES.SUPPORT, ROLES.USER])
  async getLiveChats(@Session() session: AuthenticatedSession) {
    try {
      return await this.supportService.getLiveChats(session.user.id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/live-chats/:chatId")
  @Roles([ROLES.SUPPORT, ROLES.USER])
  async getLiveChatById(
    @Param("chatId") chatId: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.supportService.getLiveChatById(chatId, session.user.id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/live-chats")
  @Roles([ROLES.SUPPORT, ROLES.USER])
  async createLiveChat(
    @Body() dto: CreateLiveChatDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.supportService.createLiveChat(
        session.user.id,
        dto.message
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/live-chats/:chatId/messages")
  @Roles([ROLES.SUPPORT, ROLES.USER])
  async createLiveChatMessage(
    @Param("chatId") chatId: string,
    @Body() dto: CreateLiveChatMessageDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.supportService.createLiveChatMessage(
        chatId,
        session.user.id,
        dto.message
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/live-chats/:chatId/attachments")
  @Roles([ROLES.SUPPORT, ROLES.USER])
  async createLiveChatAttachment(
    @Param("chatId") chatId: string,
    @Body() dto: CreateLiveChatAttachmentDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.supportService.createLiveChatAttachment(
        chatId,
        session.user.id,
        dto.imageUrl
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
