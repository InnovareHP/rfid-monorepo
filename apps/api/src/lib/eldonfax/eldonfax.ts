import { randomUUID } from "crypto";
import { appConfig } from "../../config/app-config";

// Reusable Eldon Fax client — import sendFax/listFaxes/getFax from any service.

export interface FaxAttachment {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

export interface EldonFax {
  id: string;
  status: string;
  to?: string;
  from?: string;
  direction?: string;
  pages?: number;
  createdAt?: string;
  [key: string]: unknown;
}

export class EldonFaxError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "EldonFaxError";
  }
}

export const FAX_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/tiff",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/bmp",
] as const;

export const FAX_MAX_FILE_BYTES = 25 * 1024 * 1024;

async function request<T>(
  path: string,
  init: RequestInit = {},
  apiKeyOverride?: string
): Promise<T> {
  const apiKey = apiKeyOverride ?? appConfig.ELDONFAX_API_KEY;
  if (!apiKey) {
    throw new EldonFaxError(
      "Eldon Fax is not connected — set the API key in Integrations",
      400,
      "NOT_CONNECTED"
    );
  }

  const res = await fetch(`${appConfig.ELDONFAX_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers ?? {}),
    },
  });

  const raw = await res.text();
  let body: any = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const retryAfter = res.headers.get("Retry-After");
    const detail = body?.message ?? (raw ? raw.slice(0, 200) : null);
    throw new EldonFaxError(
      detail ?? `Eldon Fax request failed (${res.status})`,
      res.status,
      body?.code,
      retryAfter ? Number(retryAfter) : undefined
    );
  }

  return body as T;
}

export interface SendFaxOptions {
  apiKey?: string;
  scheduledAt?: Date | string;
  idempotencyKey?: string;
}

export async function sendFax(
  to: string | string[],
  file: FaxAttachment,
  opts: SendFaxOptions = {}
): Promise<EldonFax> {
  if (!FAX_ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
    throw new EldonFaxError(
      `Unsupported fax document type: ${file.mimetype}`,
      400,
      "UNSUPPORTED_FILE_TYPE"
    );
  }
  if (file.buffer.length > FAX_MAX_FILE_BYTES) {
    throw new EldonFaxError(
      "Fax document exceeds 25 MB",
      400,
      "FILE_TOO_LARGE"
    );
  }

  const form = new FormData();
  for (const number of Array.isArray(to) ? to : [to]) {
    form.append("to", number);
  }
  form.append(
    "file",
    new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
    file.filename
  );
  if (opts.scheduledAt) {
    form.append(
      "scheduledAt",
      opts.scheduledAt instanceof Date
        ? opts.scheduledAt.toISOString()
        : opts.scheduledAt
    );
  }

  return request<EldonFax>(
    "/api/faxes/send",
    {
      method: "POST",
      body: form,
      // retries must never double-send a PHI document
      headers: { "Idempotency-Key": opts.idempotencyKey ?? randomUUID() },
    },
    opts.apiKey
  );
}

export async function listFaxes(
  page = 1,
  limit = 20,
  apiKey?: string
): Promise<EldonFax[]> {
  return request<EldonFax[]>(
    `/api/faxes?page=${page}&limit=${limit}`,
    {},
    apiKey
  );
}

export async function getFax(id: string, apiKey?: string): Promise<EldonFax> {
  return request<EldonFax>(`/api/faxes/${encodeURIComponent(id)}`, {}, apiKey);
}
