import { useTeamLayoutContext } from "@/routes/_team";
import { createFileRoute, Link } from "@tanstack/react-router";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_team/$team/success")({
  component: RouteComponent,
});

function RouteComponent() {
  const { activeSubscription } = useTeamLayoutContext();

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
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <CheckCircle2 className="h-20 w-20 text-green-600" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="text-4xl font-bold tracking-tight text-foreground"
      >
        Congratulations! 🎉
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="mt-4 max-w-xl text-lg text-muted-foreground leading-relaxed"
      >
        Your plan has been successfully activated. You now have full access to
        all premium features. We're excited to help your team grow!
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-2 font-medium text-primary"
      >
        <Sparkles className="h-4 w-4" />
        {activeSubscription?.plan} Activated
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
        className="mt-10"
      >
        <Link
          to="/"
          className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-white font-medium shadow-lg hover:shadow-xl transition duration-200"
        >
          Go to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
