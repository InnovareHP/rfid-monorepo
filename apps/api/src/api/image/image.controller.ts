import {
  BadRequestException,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { memoryStorage } from "multer";
import { DeleteImageDto } from "./dto/image-schema";
import { ImageService } from "./image.service";

@Controller("image")
@UseGuards(AuthGuard)
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("image", {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Use multipart/form-data and the "file" field name.'
      );
    }

    const data = await this.imageService.uploadImage(file);

    return data;
  }

  @Delete(":id")
  DeleteImage(@Param() deleteImageDto: DeleteImageDto) {
    try {
      return this.imageService.deleteImage(deleteImageDto.id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
