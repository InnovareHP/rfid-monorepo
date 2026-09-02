import { createZodDto } from "nestjs-zod";
import {
  ListInvoicesQuerySchema,
  ListTransactionsQuerySchema,
  UpdateSeatsSchema,
} from "./billing.dto";

export class ListTransactionsQueryDto extends createZodDto(
  ListTransactionsQuerySchema
) {}
export class ListInvoicesQueryDto extends createZodDto(
  ListInvoicesQuerySchema
) {}
export class UpdateSeatsDto extends createZodDto(UpdateSeatsSchema) {}
