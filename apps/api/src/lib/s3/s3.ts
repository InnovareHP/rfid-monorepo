import { S3Client } from "@aws-sdk/client-s3";
import { appConfig } from "../../config/app-config";

export const s3 = new S3Client({
  region: appConfig.AWS_REGION,
  credentials: {
    accessKeyId: appConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: appConfig.AWS_SECRET_ACCESS_KEY,
  },
});
