import { Module } from "@nestjs/common";
import { BoardModule } from "../../board/board.module";
import { FormPublicController } from "./form-public.controller";
import { FormController } from "./form.controller";
import { FormService } from "./form.service";

@Module({
  imports: [BoardModule],
  controllers: [FormController, FormPublicController],
  providers: [FormService],
  exports: [FormService],
})
export class FormModule {}
