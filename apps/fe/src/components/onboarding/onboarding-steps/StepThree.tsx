import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { itemVariants, listVariants } from "@/lib/framer";
import { motion } from "framer-motion";
import type { UseFormRegister } from "react-hook-form";
import { type FormValues } from "../onboarding";

type StepThreeProps = {
  selectedInterests: string[];
  interestOptions: {
    id: string;
    label: string;
    icon: React.ReactNode;
  }[];
  handleInterestToggle: (interestId: string) => void;
  handleContinue: () => void;
  register: UseFormRegister<FormValues>;
};

const StepThree = ({
  selectedInterests,
  interestOptions,
  handleInterestToggle,
  handleContinue,
  register,
}: StepThreeProps) => (
  <div className="space-y-8">
    <div className="text-center space-y-2">
      <h1 className="text-2xl font-semibold">What's on your mind?</h1>
      <p>Select as many as you want.</p>
    </div>

    <div className="max-w-2xl mx-auto">
      <motion.div
        className="flex flex-wrap gap-3"
        variants={listVariants}
        initial="initial"
        animate="animate"
      >
        {interestOptions.map((interest) => (
          <motion.div key={interest.id} variants={itemVariants}>
            <Badge
              variant={
                selectedInterests.includes(interest.id) ? "default" : "outline"
              }
              className={`cursor-pointer transition-all duration-200 px-4 py-2 text-sm hover:bg-primary/10 ${
                selectedInterests.includes(interest.id) ? "bg-primary/70" : ""
              }`}
              onClick={() => handleInterestToggle(interest.id)}
              {...register("interests")}
            >
              <span className="mr-2">{interest.icon}</span>
              {interest.label}
            </Badge>
          </motion.div>
        ))}
      </motion.div>
    </div>

    <div className="flex justify-center">
      <Button type="button" variant="secondary" onClick={handleContinue}>
        Continue
      </Button>
    </div>
  </div>
);

export default StepThree;
