import { createZodDto } from "nestjs-zod";
import {
  ListInvoicesQuerySchema,
  ListTransactionsQuerySchema,
} from "./billing.dto";

export class ListTransactionsQueryDto extends createZodDto(
  ListTransactionsQuerySchema
) {}
export class ListInvoicesQueryDto extends createZodDto(
  ListInvoicesQuerySchema
) {}
