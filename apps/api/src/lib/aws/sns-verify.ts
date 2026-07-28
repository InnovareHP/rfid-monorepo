import { createVerify } from "crypto";

export interface SnsMessage {
  Type: string;
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  SubscribeURL?: string;
  Token?: string;
}

// Field order is fixed by the SNS signature spec and differs per message type.
const SIGNED_FIELDS: Record<string, string[]> = {
  Notification: [
    "Message",
    "MessageId",
    "Subject",
    "Timestamp",
    "TopicArn",
    "Type",
  ],
  SubscriptionConfirmation: [
    "Message",
    "MessageId",
    "SubscribeURL",
    "Timestamp",
    "Token",
    "TopicArn",
    "Type",
  ],
  UnsubscribeConfirmation: [
    "Message",
    "MessageId",
    "SubscribeURL",
    "Timestamp",
    "Token",
    "TopicArn",
    "Type",
  ],
};

const certCache = new Map<string, string>();

// Only AWS-owned SNS hosts may serve the signing certificate.
function assertCertUrl(url: string): URL {
  const parsed = new URL(url);

  if (parsed.protocol !== "https:") {
    throw new Error("SNS signing cert URL is not https");
  }

  if (!/^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(parsed.hostname)) {
    throw new Error(`Untrusted SNS signing cert host: ${parsed.hostname}`);
  }

  return parsed;
}

async function fetchCert(url: string): Promise<string> {
  const cached = certCache.get(url);
  if (cached) return cached;

  const response = await fetch(assertCertUrl(url));
  if (!response.ok) {
    throw new Error(`Failed to fetch SNS signing cert: ${response.status}`);
  }

  const cert = await response.text();
  certCache.set(url, cert);

  return cert;
}

function canonicalString(message: SnsMessage): string {
  const fields = SIGNED_FIELDS[message.Type];
  if (!fields) throw new Error(`Unsupported SNS message type: ${message.Type}`);

  return fields
    .filter((field) => message[field] !== undefined && message[field] !== null)
    .map((field) => `${field}\n${message[field]}\n`)
    .join("");
}

export async function verifySnsMessage(
  message: SnsMessage,
  expectedTopicArn?: string
): Promise<boolean> {
  if (expectedTopicArn && message.TopicArn !== expectedTopicArn) return false;

  const algorithm =
    message.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1";
  const cert = await fetchCert(message.SigningCertURL);

  return createVerify(algorithm)
    .update(canonicalString(message), "utf8")
    .verify(cert, message.Signature, "base64");
}
