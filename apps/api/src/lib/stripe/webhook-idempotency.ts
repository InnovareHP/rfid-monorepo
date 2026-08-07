import { prisma } from "../prisma/prisma";

// Insert first and let parallel deliveries race at the unique constraint —
// find-then-insert leaves a window where both deliveries see nothing.
export const claimWebhookEvent = async (provider: string, eventId: string) => {
  try {
    await prisma.webhookEvent.create({ data: { provider, eventId } });
    return true;
  } catch {
    return false;
  }
};

// Release on handler failure so Stripe's retry is processed rather than
// dropped as a duplicate.
export const releaseWebhookEvent = async (
  provider: string,
  eventId: string
) => {
  await prisma.webhookEvent
    .delete({ where: { provider_eventId: { provider, eventId } } })
    .catch(() => undefined);
};
