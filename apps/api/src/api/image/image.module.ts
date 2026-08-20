import { Module } from "@nestjs/common";
import { SupportModule } from "../support/support.module";
import { ImageController } from "./image.controller";
import { ImageService } from "./image.service";

@Module({
  imports: [SupportModule],
  providers: [ImageService],
  exports: [ImageService],
  controllers: [ImageController],
})
export class ImageModule {}
