import { createZodDto } from "nestjs-zod";
import {
  CreateSubscriberSchema,
  ListSubscribersSchema,
  PublicSubscribeSchema,
} from "./subscriber.schema";

export class CreateSubscriberDto extends createZodDto(CreateSubscriberSchema) {}
export class ListSubscribersDto extends createZodDto(ListSubscribersSchema) {}
export class PublicSubscribeDto extends createZodDto(PublicSubscribeSchema) {}
