import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { appConfig } from "../../config/app-config";
import { s3 } from "../../lib/s3/s3";
import { ImageVisibility } from "./dto/image.dto";

const PRESIGN_TTL_SECONDS = 900;

// The key prefix is the ownership record, so every read checks it before serving.
const scopedPrefix = (visibility: ImageVisibility, scopeId: string) =>
  `${visibility}/${scopeId}/`;

const publicBaseUrl =
  appConfig.S3_PUBLIC_BASE_URL ??
  `https://${appConfig.S3_UPLOADS_BUCKET}.s3.${appConfig.AWS_REGION}.amazonaws.com`;

// S3 keys stay ASCII so the presigned signature and the stored URL always agree.
const safeName = (filename: string) =>
  filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);

// The stored form of a private image. Exported so a feature holding an imageUrl
// can match it back to a key by exact equality instead of parsing the string.
export const privateViewUrl = (key: string) =>
  `${appConfig.API_URL}/api/image/view?key=${encodeURIComponent(key)}`;

@Injectable()
export class ImageService {
  async uploadImage(
    file: Express.Multer.File,
    scopeId: string,
    visibility: ImageVisibility
  ) {
    const key = `${scopedPrefix(visibility, scopeId)}${randomUUID()}-${safeName(
      file.originalname
    )}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: appConfig.S3_UPLOADS_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: "AES256",
      })
    );

    const url =
      visibility === "public" ? `${publicBaseUrl}/${key}` : privateViewUrl(key);

    return { url, secure_url: url, public_id: key };
  }

  async deleteImage(key: string, scopeId: string) {
    this.assertOwnership(key, scopeId);

    await s3.send(
      new DeleteObjectCommand({
        Bucket: appConfig.S3_UPLOADS_BUCKET,
        Key: key,
      })
    );

    return { result: "ok" };
  }

  async getViewUrl(key: string, scopeId: string) {
    this.assertOwnership(key, scopeId);

    return this.presign(key);
  }

  // Callers must have established the right to this key by other means. Only the
  // support-attachment path uses it, where the grant comes from the ticket.
  async presign(key: string) {
    return getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: appConfig.S3_UPLOADS_BUCKET,
        Key: key,
      }),
      { expiresIn: PRESIGN_TTL_SECONDS }
    );
  }

  ownedBy(key: string, scopeId: string) {
    return (
      key.startsWith(scopedPrefix("public", scopeId)) ||
      key.startsWith(scopedPrefix("private", scopeId))
    );
  }

  private assertOwnership(key: string, scopeId: string) {
    const owned = this.ownedBy(key, scopeId);

    if (!owned) {
      throw new ForbiddenException("Image does not belong to this account");
    }
  }
}
