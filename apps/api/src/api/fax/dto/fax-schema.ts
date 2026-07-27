import { createZodDto } from "nestjs-zod";
import {
  ConnectFaxIntegrationSchema,
  ListFaxesSchema,
  SendFaxSchema,
} from "./fax.dto";

export class SendFaxDto extends createZodDto(SendFaxSchema) {}
export class ListFaxesDto extends createZodDto(ListFaxesSchema) {}
export class ConnectFaxIntegrationDto extends createZodDto(
  ConnectFaxIntegrationSchema
) {}
