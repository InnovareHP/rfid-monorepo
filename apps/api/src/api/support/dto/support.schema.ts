import { createZodDto } from "nestjs-zod";
import {
  AssignTicketSchema,
  CreateLiveChatAttachmentSchema,
  CreateLiveChatMessageSchema,
  CreateLiveChatSchema,
  CreateTicketAttachmentSchema,
  CreateTicketMessageSchema,
  CreateTicketSchema,
  RateTicketSchema,
  UpdateTicketSchema,
} from "./support.dto";

export class CreateTicketDto extends createZodDto(CreateTicketSchema) {}
export class UpdateTicketDto extends createZodDto(UpdateTicketSchema) {}
export class CreateTicketMessageDto extends createZodDto(
  CreateTicketMessageSchema
) {}
export class CreateTicketAttachmentDto extends createZodDto(
  CreateTicketAttachmentSchema
) {}
export class CreateLiveChatDto extends createZodDto(CreateLiveChatSchema) {}
export class CreateLiveChatMessageDto extends createZodDto(
  CreateLiveChatMessageSchema
) {}
export class CreateLiveChatAttachmentDto extends createZodDto(
  CreateLiveChatAttachmentSchema
) {}
export class AssignTicketDto extends createZodDto(AssignTicketSchema) {}
export class RateTicketDto extends createZodDto(RateTicketSchema) {}
