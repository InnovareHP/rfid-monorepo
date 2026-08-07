import {
  CreateEmailIdentityCommand,
  DeleteEmailIdentityCommand,
  GetEmailIdentityCommand,
  PutEmailIdentityMailFromAttributesCommand,
  SESv2Client,
} from "@aws-sdk/client-sesv2";
import { appConfig } from "../../config/app-config";

const ses = new SESv2Client({
  region: appConfig.AWS_REGION,
  ...(appConfig.AWS_ACCESS_KEY_ID && appConfig.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: appConfig.AWS_ACCESS_KEY_ID,
          secretAccessKey: appConfig.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

export type DnsRecord = {
  type: "CNAME" | "MX" | "TXT";
  name: string;
  value: string;
  purpose: string;
};

// Bounces and complaints come back to a subdomain we control the SPF of, which
// is what makes the envelope sender align with the From domain.
const mailFromOf = (domain: string) => `mail.${domain}`;

const dnsRecordsFor = (domain: string, dkimTokens: string[]): DnsRecord[] => [
  ...dkimTokens.map((token) => ({
    type: "CNAME" as const,
    name: `${token}._domainkey.${domain}`,
    value: `${token}.dkim.amazonses.com`,
    purpose: "DKIM signing",
  })),
  {
    type: "MX" as const,
    name: mailFromOf(domain),
    value: `10 feedback-smtp.${appConfig.AWS_REGION}.amazonses.com`,
    purpose: "Bounce and complaint delivery",
  },
  {
    type: "TXT" as const,
    name: mailFromOf(domain),
    value: "v=spf1 include:amazonses.com ~all",
    purpose: "SPF authorization",
  },
];

export type IdentityProvisionResult = {
  dnsRecords: DnsRecord[];
};

// Creating an identity twice is not an error worth surfacing: the records are
// read back from SES either way, so a retry converges instead of failing.
export async function provisionDomainIdentity(
  domain: string
): Promise<IdentityProvisionResult> {
  try {
    await ses.send(
      new CreateEmailIdentityCommand({
        EmailIdentity: domain,
        DkimSigningAttributes: { NextSigningKeyLength: "RSA_2048_BIT" },
      })
    );
  } catch (error) {
    if ((error as { name?: string }).name !== "AlreadyExistsException") throw error;
  }

  await ses.send(
    new PutEmailIdentityMailFromAttributesCommand({
      EmailIdentity: domain,
      MailFromDomain: mailFromOf(domain),
      // Refuse to send rather than fall back to amazonses.com, which would
      // break the alignment the custom MAIL FROM exists to establish.
      BehaviorOnMxFailure: "REJECT_MESSAGE",
    })
  );

  const identity = await ses.send(
    new GetEmailIdentityCommand({ EmailIdentity: domain })
  );

  return {
    dnsRecords: dnsRecordsFor(domain, identity.DkimAttributes?.Tokens ?? []),
  };
}

export type IdentityStatus = {
  verified: boolean;
  dkimStatus: string | null;
  dnsRecords: DnsRecord[];
};

export async function getDomainIdentityStatus(
  domain: string
): Promise<IdentityStatus> {
  const identity = await ses.send(
    new GetEmailIdentityCommand({ EmailIdentity: domain })
  );

  return {
    verified: Boolean(identity.VerifiedForSendingStatus),
    dkimStatus: identity.DkimAttributes?.Status ?? null,
    dnsRecords: dnsRecordsFor(domain, identity.DkimAttributes?.Tokens ?? []),
  };
}

export async function deleteDomainIdentity(domain: string) {
  try {
    await ses.send(new DeleteEmailIdentityCommand({ EmailIdentity: domain }));
  } catch (error) {
    if ((error as { name?: string }).name !== "NotFoundException") throw error;
  }
}
