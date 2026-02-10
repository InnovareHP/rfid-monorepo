import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { listVariants } from "@/lib/framer";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { UseFormRegister } from "react-hook-form";
import { type FormValues } from "../onboarding";

type StepFourProps = {
  register: UseFormRegister<FormValues>;
  isSubmitting: boolean;
};

const StepFour = ({ register, isSubmitting }: StepFourProps) => (
  <div className="space-y-8">
    <div className="text-center space-y-2">
      <h1 className="text-2xl font-semibold">Create your organization</h1>
      <p>
        This will help us personalize your experience and provide you with the
        best possible service.
      </p>
    </div>

    <div className="max-w-md mx-auto space-y-2">
      <Label htmlFor="organizationName">Organization Name</Label>
      <Input
        id="organizationName"
        type="text"
        placeholder="e.g. Dashboard Inc"
        className="focus-visible:ring-primary"
        {...register("organizationName", { required: true })}
      />
    </div>

    <div className="max-w-2xl mx-auto">
      <motion.div
        className="flex flex-wrap gap-3"
        variants={listVariants}
        initial="initial"
        animate="animate"
      ></motion.div>
    </div>

    <div className="flex justify-center">
      <Button type="submit" variant="secondary" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  </div>
);

export default StepFour;
