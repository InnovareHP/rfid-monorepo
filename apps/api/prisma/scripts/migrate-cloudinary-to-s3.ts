import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { appConfig } from "../../src/config/app-config";
import { prisma } from "../../src/lib/prisma/prisma";
import { s3 } from "../../src/lib/s3/s3";

// Dry run unless --apply is passed, so a mistake never rewrites production rows.
const APPLY = process.argv.includes("--apply");

const CLOUDINARY_HOST = "res.cloudinary.com";

const publicBaseUrl =
  appConfig.S3_PUBLIC_BASE_URL ??
  `https://${appConfig.S3_UPLOADS_BUCKET}.s3.${appConfig.AWS_REGION}.amazonaws.com`;

type Visibility = "public" | "private";

const stats = { scanned: 0, copied: 0, skipped: 0, failed: 0 };
const migrated = new Map<string, string>();

const isCloudinary = (value: unknown): value is string =>
  typeof value === "string" && value.includes(CLOUDINARY_HOST);

const safeName = (url: string) => {
  const last = url.split("?")[0].split("/").pop() ?? "image";
  return last.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
};

// Returns the new URL, copying the object into S3 the first time it is seen.
async function migrateUrl(
  url: string,
  scopeId: string,
  visibility: Visibility
): Promise<string | null> {
  stats.scanned++;

  const cached = migrated.get(url);
  if (cached) return cached;

  const key = `${visibility}/${scopeId}/${randomUUID()}-${safeName(url)}`;

  const newUrl =
    visibility === "public"
      ? `${publicBaseUrl}/${key}`
      : `${appConfig.API_URL}/api/image/view?key=${encodeURIComponent(key)}`;

  if (!APPLY) {
    console.log(`  would copy ${url}\n            -> ${key}`);
    stats.skipped++;
    migrated.set(url, newUrl);
    return newUrl;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`fetch ${response.status}`);

    await s3.send(
      new PutObjectCommand({
        Bucket: appConfig.S3_UPLOADS_BUCKET,
        Key: key,
        Body: Buffer.from(await response.arrayBuffer()),
        ContentType: response.headers.get("content-type") ?? "image/jpeg",
        ServerSideEncryption: "AES256",
      })
    );

    stats.copied++;
    migrated.set(url, newUrl);
    return newUrl;
  } catch (error) {
    stats.failed++;
    console.error(`  FAILED ${url}: ${(error as Error).message}`);
    return null;
  }
}

// Rewrites every Cloudinary string anywhere inside a landing page sections blob.
async function migrateJson(
  node: unknown,
  scopeId: string
): Promise<{ value: unknown; changed: boolean }> {
  if (isCloudinary(node)) {
    const next = await migrateUrl(node, scopeId, "public");
    return next ? { value: next, changed: true } : { value: node, changed: false };
  }

  if (Array.isArray(node)) {
    let changed = false;
    const out: unknown[] = [];
    for (const item of node) {
      const result = await migrateJson(item, scopeId);
      changed = changed || result.changed;
      out.push(result.value);
    }
    return { value: out, changed };
  }

  if (node && typeof node === "object") {
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(node)) {
      const result = await migrateJson(item, scopeId);
      changed = changed || result.changed;
      out[key] = result.value;
    }
    return { value: out, changed };
  }

  return { value: node, changed: false };
}

async function migrateOrganizationLogos() {
  console.log("\norganization.logo");
  const rows = await prisma.organization.findMany({
    select: { id: true, logo: true },
  });

  for (const row of rows) {
    if (!isCloudinary(row.logo)) continue;

    const url = await migrateUrl(row.logo, row.id, "public");
    if (!url || !APPLY) continue;

    await prisma.organization.update({
      where: { id: row.id },
      data: { logo: url },
    });
  }
}

async function migrateExpenses() {
  console.log("\nexpense.imageUrl");
  const rows = await prisma.expense.findMany({
    select: { id: true, imageUrl: true, organizationId: true },
  });

  for (const row of rows) {
    if (!isCloudinary(row.imageUrl)) continue;

    const url = await migrateUrl(row.imageUrl, row.organizationId, "private");
    if (!url || !APPLY) continue;

    await prisma.expense.update({
      where: { id: row.id },
      data: { imageUrl: url },
    });
  }
}

async function migrateLandingPages() {
  console.log("\nlandingPage.sections");
  const rows = await prisma.landingPage.findMany({
    select: { id: true, sections: true, organizationId: true },
  });

  for (const row of rows) {
    const result = await migrateJson(row.sections, row.organizationId);
    if (!result.changed || !APPLY) continue;

    await prisma.landingPage.update({
      where: { id: row.id },
      data: { sections: result.value as never },
    });
  }
}

async function migrateSupportAttachments() {
  console.log("\nsupportTicketAttachment.imageUrl");
  const ticketRows = await prisma.supportTicketAttachment.findMany({
    select: { id: true, imageUrl: true, supportTicketMessageId: true },
  });

  for (const row of ticketRows) {
    if (!isCloudinary(row.imageUrl)) continue;

    const url = await migrateUrl(
      row.imageUrl,
      row.supportTicketMessageId,
      "public"
    );
    if (!url || !APPLY) continue;

    await prisma.supportTicketAttachment.update({
      where: { id: row.id },
      data: { imageUrl: url },
    });
  }

  console.log("\nsupportLiveChatAttachment.imageUrl");
  const chatRows = await prisma.supportLiveChatAttachment.findMany({
    select: { id: true, imageUrl: true, sender: true },
  });

  for (const row of chatRows) {
    if (!isCloudinary(row.imageUrl)) continue;

    const url = await migrateUrl(row.imageUrl, row.sender, "public");
    if (!url || !APPLY) continue;

    await prisma.supportLiveChatAttachment.update({
      where: { id: row.id },
      data: { imageUrl: url },
    });
  }
}

async function migrateManualSteps() {
  console.log("\nmanualStep.imageUrl");
  const rows = await prisma.manualStep.findMany({
    select: { id: true, imageUrl: true, articleId: true },
  });

  for (const row of rows) {
    if (!isCloudinary(row.imageUrl)) continue;

    const url = await migrateUrl(row.imageUrl, row.articleId, "public");
    if (!url || !APPLY) continue;

    await prisma.manualStep.update({
      where: { id: row.id },
      data: { imageUrl: url },
    });
  }
}

async function main() {
  console.log(
    APPLY
      ? `APPLY MODE - copying into ${appConfig.S3_UPLOADS_BUCKET} and rewriting rows`
      : "DRY RUN - pass --apply to copy objects and rewrite rows"
  );

  await migrateOrganizationLogos();
  await migrateExpenses();
  await migrateLandingPages();
  await migrateSupportAttachments();
  await migrateManualSteps();

  console.log(
    `\nscanned ${stats.scanned} | copied ${stats.copied} | dry-run ${stats.skipped} | failed ${stats.failed}`
  );

  if (stats.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
