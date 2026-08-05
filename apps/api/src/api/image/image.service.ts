import { ForbiddenException, Injectable } from "@nestjs/common";
import * as toStream from "buffer-to-stream";
import { v2 } from "cloudinary";

// Cloudinary is the only store, so the folder path is the ownership record.
const scopedFolder = (scopeId: string) => `uploads/${scopeId}`;

@Injectable()
export class ImageService {
  async uploadImage(
    file: Express.Multer.File,
    scopeId: string,
    opts?: { publicId?: string }
  ) {
    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        {
          folder: scopedFolder(scopeId),
          public_id: opts?.publicId,
          use_filename: !opts?.publicId,
          unique_filename: true,
          overwrite: false,
          resource_type: "image",
        },
        (error, result) => {
          if (error) return reject(new Error(error.message || "Upload failed"));
          if (!result)
            return reject(new Error("No result returned from upload"));
          resolve(result);
        }
      );

      toStream(file.buffer).pipe(upload);
    });
  }

  async deleteImage(publicId: string, scopeId: string) {
    if (!publicId.startsWith(`${scopedFolder(scopeId)}/`)) {
      throw new ForbiddenException("Image does not belong to this account");
    }

    return new Promise((resolve, reject) => {
      v2.uploader.destroy(publicId, (error, result) => {
        if (error) return reject(new Error(error.message || "Delete failed"));
        if (!result) return reject(new Error("No result returned from delete"));
        resolve(result);
      });
    });
  }
}
