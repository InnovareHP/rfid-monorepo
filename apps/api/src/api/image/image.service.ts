import { Injectable } from "@nestjs/common";
import * as toStream from "buffer-to-stream";
import { v2 } from "cloudinary";

@Injectable()
export class ImageService {
  async uploadImage(
    file: Express.Multer.File,
    opts?: { folder?: string; publicId?: string }
  ) {
    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        {
          folder: opts?.folder ?? "uploads",
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

  async deleteImage(publicId: string) {
    // NOTE: include the folder in publicId, e.g. "uploads/abc123" or "users/123/avatar"
    return new Promise((resolve, reject) => {
      v2.uploader.destroy(publicId, (error, result) => {
        if (error) return reject(new Error(error.message || "Delete failed"));
        if (!result) return reject(new Error("No result returned from delete"));
        resolve(result);
      });
    });
  }
}
