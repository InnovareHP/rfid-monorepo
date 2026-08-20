import { PrismaClient } from "@prisma/client";

const raw = new PrismaClient();

// Social sign-in is disabled in src/lib/auth/auth.ts, so any token left on
// UserAccount predates the passkey-only port and authorizes nothing we use.
// Clearing beats encrypting: an encrypted dead credential is still a credential.
async function run() {
  const stale = await raw.userAccount.count({
    where: {
      OR: [
        { accessToken: { not: null } },
        { refreshToken: { not: null } },
        { idToken: { not: null } },
      ],
    },
  });

  if (stale === 0) {
    console.log("[UserAccount] no residual OAuth tokens");
    return;
  }

  // password is untouched: credential rows keep their better-auth hash.
  const { count } = await raw.userAccount.updateMany({
    where: {
      OR: [
        { accessToken: { not: null } },
        { refreshToken: { not: null } },
        { idToken: { not: null } },
      ],
    },
    data: {
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
    },
  });

  console.log(`[UserAccount] cleared OAuth tokens on ${count}/${stale} rows`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => raw.$disconnect());
