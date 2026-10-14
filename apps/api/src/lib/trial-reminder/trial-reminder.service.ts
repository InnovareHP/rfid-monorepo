import { Injectable } from "@nestjs/common";
import { prisma } from "../prisma/prisma";
import { runUnscoped } from "../prisma/tenant-context";
import { redis } from "../redis/redis";
import { getPlan } from "../stripe/plans";
import { queueTrialEndingEmail } from "../stripe/stripe-events";

const WINDOW_MS = 24 * 60 * 60 * 1000;

// Outlives the window so an hourly sweep never reminds the same trial twice.
const SENT_TTL_SECONDS = 3 * 24 * 60 * 60;

// Stripe's trial_will_end covers three days out; this covers the final day.
@Injectable()
export class TrialReminderService {
  async sweep(now = new Date()): Promise<number> {
    const due = await runUnscoped(() =>
      prisma.subscription.findMany({
        where: {
          status: "trialing",
          cancelAtPeriodEnd: { not: true },
          trialEnd: { gt: now, lte: new Date(now.getTime() + WINDOW_MS) },
        },
        select: {
          id: true,
          plan: true,
          stripeCustomerId: true,
          trialEnd: true,
        },
      })
    );

    let sent = 0;

    for (const subscription of due) {
      const key = `trial-reminder:${subscription.id}`;
      const claimed = await redis.set(key, "1", "EX", SENT_TTL_SECONDS, "NX");
      if (!claimed) continue;

      try {
        await runUnscoped(() =>
          queueTrialEndingEmail(
            subscription.stripeCustomerId,
            Math.floor((subscription.trialEnd as Date).getTime() / 1000),
            getPlan(subscription.plan)?.label,
            Math.floor(now.getTime() / 1000)
          )
        );
        sent += 1;
      } catch (error) {
        await redis.del(key);
        throw error;
      }
    }

    return sent;
  }
}
