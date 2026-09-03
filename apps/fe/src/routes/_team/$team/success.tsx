import type { Subscription } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Card } from "@dashboard/ui/components/card";
import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useEffect } from "react";

const BRAND_LOCKUP_WHITE =
  "/branding/Full/Refidly%20%5BFull%5D%20-%20White-no-bg.png";

interface RouteContext {
  activeSubscription: Subscription | null;
}

export const Route = createFileRoute("/_team/$team/success")({
  component: RouteComponent,
});

function RouteComponent() {
  const { team } = Route.useParams();
  const ctx = useRouteContext({ from: "__root__" }) as RouteContext;
  const activeSubscription = ctx?.activeSubscription;

  useEffect(() => {
    const duration = 1800;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 80,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 80,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="gap-0 overflow-hidden p-0 text-center shadow-lg">
          {/* Same gradient family as the nav rail and the auth panel. */}
          <div className="from-brand-rail-from via-brand-rail-mid to-brand-rail-via bg-gradient-to-br px-8 py-6">
            <img
              src={BRAND_LOCKUP_WHITE}
              alt="Refidly"
              className="mx-auto w-32"
            />
          </div>

          <div className="px-8 py-8">
            <div className="bg-primary/10 mx-auto flex size-14 items-center justify-center rounded-full">
              <Check className="text-primary size-7" strokeWidth={2.5} />
            </div>

            <h1 className="text-foreground mt-5 text-2xl font-semibold tracking-tight">
              Congratulations!
            </h1>

            <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm leading-relaxed">
              Your plan is active. You now have full access to every premium
              feature.
            </p>

            {activeSubscription?.plan && (
              <Badge variant="success" className="mt-5 gap-1.5">
                <Sparkles className="size-3.5" />
                {activeSubscription.plan} activated
              </Badge>
            )}

            <Button asChild className="mt-7 w-full">
              <Link to="/$team" params={{ team }}>
                Go to Dashboard
              </Link>
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
