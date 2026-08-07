import {
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
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
  type: "CNAME";
  name: string;
  value: string;
  purpose: string;
};

// EasyDKIM alone verifies the domain and aligns DKIM for DMARC. A custom MAIL
// FROM would add an MX and an SPF TXT for SPF alignment too, but it mutates the
// identity - and identities are per AWS account, so a domain already sending
// elsewhere in this account would have its config rewritten from here.
const dnsRecordsFor = (domain: string, dkimTokens: string[]): DnsRecord[] =>
  dkimTokens.map((token) => ({
    type: "CNAME" as const,
    name: `${token}._domainkey.${domain}`,
    value: `${token}.dkim.amazonses.com`,
    purpose: "DKIM signing",
  }));

export type IdentityProvisionResult = {
  dnsRecords: DnsRecord[];
  alreadyVerified: boolean;
};

// Nothing here mutates an existing identity: an AlreadyExists means the domain
// is already set up in this account, and its tokens are simply read back.
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
    if ((error as { name?: string }).name !== "AlreadyExistsException") {
      throw error;
    }
  }

  const identity = await ses.send(
    new GetEmailIdentityCommand({ EmailIdentity: domain })
  );

  return {
    dnsRecords: dnsRecordsFor(domain, identity.DkimAttributes?.Tokens ?? []),
    alreadyVerified: Boolean(identity.VerifiedForSendingStatus),
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
