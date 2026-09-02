import { Logger } from "@nestjs/common";
import { raw } from "express";
import type { NextFunction, Request, Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { appConfig } from "../../config/app-config";

const logger = new Logger("StripeWebhook");

// better-call re-serializes a consumed body unless it is already a string, so
// handing it the exact UTF-8 payload keeps the bytes Stripe signed intact.
const parseRaw = raw({ type: "*/*", limit: "1mb" });

// Reproduces Stripe's own check so a rejection names which input is wrong.
const diagnose = (payload: string, header: string) => {
  const parts = new Map(
    header.split(",").map((p) => p.split("=") as [string, string])
  );
  const timestamp = parts.get("t");
  const signature = parts.get("v1");

  if (!timestamp || !signature) {
    logger.error("stripe-signature header carries no t or v1 pair");
    return;
  }

  const expected = createHmac("sha256", appConfig.STRIPE_WEBHOOK_SECRET ?? "")
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const matches =
    expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

  const bytes = Buffer.byteLength(payload);

  if (matches) {
    logger.log(`signature verified over ${bytes} raw bytes`);
    return;
  }

  const skew = Math.round(Math.abs(Date.now() / 1000 - Number(timestamp)));
  logger.error(
    `signature mismatch over ${bytes} raw bytes, skew ${skew}s, secret length ${appConfig.STRIPE_WEBHOOK_SECRET?.length ?? 0}`
  );
};

export const stripeWebhookRawBody = (
  req: Request,
  res: Response,
  next: NextFunction
) =>
  parseRaw(req, res, (err?: unknown) => {
    if (err) return next(err);

    const payload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
    const header = req.headers["stripe-signature"];

    if (payload && typeof header === "string") diagnose(payload, header);

    req.body = payload;
    next();
  });
