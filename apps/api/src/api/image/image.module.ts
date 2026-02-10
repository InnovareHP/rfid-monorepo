import { Module } from "@nestjs/common";
import { ImageController } from "./image.controller";
import { CloudinaryProvider } from "./image.provider";
import { ImageService } from "./image.service";

@Module({
  providers: [CloudinaryProvider, ImageService],
  exports: [CloudinaryProvider, ImageService],
  controllers: [ImageController],
})
export class ImageModule {}
