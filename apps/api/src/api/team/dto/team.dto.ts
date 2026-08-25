import { createZodDto } from "nestjs-zod";
import { ListMembersSchema } from "./team.schema";

export class ListMembersDto extends createZodDto(ListMembersSchema) {}
