import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { appConfig } from "../../src/config/app-config";
import { s3 } from "../../src/lib/s3/s3";

const raw = new PrismaClient();

const bucket = appConfig.S3_UPLOADS_BUCKET;

const publicBaseUrl =
  appConfig.S3_PUBLIC_BASE_URL ??
  `https://${bucket}.s3.${appConfig.AWS_REGION}.amazonaws.com`;

const privateViewUrl = (key: string) =>
  `${appConfig.API_URL}/api/image/view?key=${encodeURIComponent(key)}`;

// Only rows still pointing at the unauthenticated bucket URL need moving.
const publicKeyOf = (imageUrl: string) => {
  const prefix = `${publicBaseUrl}/`;
  if (!imageUrl.startsWith(prefix)) return null;

  const key = decodeURIComponent(imageUrl.slice(prefix.length));
  return key.startsWith("public/") ? key : null;
};

// public/<scope>/<file> -> private/<scope>/<file>, so the uploader still owns the
// prefix and support agents reach it through the ticket grant instead.
const privateKeyFor = (key: string) => `private/${key.slice("public/".length)}`;

async function exists(key: string) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function move(key: string) {
  const target = privateKeyFor(key);

  if (!(await exists(key))) {
    // Object already gone; the row is a dangling reference either way.
    return { target, copied: false };
  }

  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${key}`,
      Key: target,
      ServerSideEncryption: "AES256",
      MetadataDirective: "COPY",
    })
  );

  // Delete only once the copy is confirmed present, so a failure leaves the
  // original readable rather than losing the attachment.
  if (!(await exists(target))) {
    throw new Error(`copy of ${key} not verifiable, leaving original in place`);
  }

  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

  return { target, copied: true };
}

const TABLES = [
  { model: raw.supportTicketAttachment, label: "SupportTicketAttachment" },
  { model: raw.supportLiveChatAttachment, label: "SupportLiveChatAttachment" },
] as const;

async function run() {
  for (const { model, label } of TABLES) {
    const rows: { id: string; imageUrl: string }[] = await (
      model as any
    ).findMany({ select: { id: true, imageUrl: true } });

    let moved = 0;
    let dangling = 0;

    for (const row of rows) {
      const key = publicKeyOf(row.imageUrl);
      if (!key) continue;

      const { target, copied } = await move(key);
      if (!copied) dangling++;

      await (model as any).update({
        where: { id: row.id },
        data: { imageUrl: privateViewUrl(target) },
      });
      moved++;
    }

    console.log(
      `[${label}] privatized ${moved}/${rows.length} (${dangling} had no object in S3)`
    );
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => raw.$disconnect());
