import { Card, CardContent } from "@dashboard/ui/components/card";
import { itemVariants, listVariants } from "@/lib/framer";
import { motion } from "framer-motion";
import type { UseFormRegister } from "react-hook-form";
import { type FormValues } from "../onboarding";

type StepTwoProps = {
  purposeOptions: {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
  }[];
  selectedUsage: string;
  handlePurposeSelect: (purposeId: string) => void;
  register: UseFormRegister<FormValues>;
};

const StepTwo = ({
  purposeOptions,
  selectedUsage,
  handlePurposeSelect,
  register,
}: StepTwoProps) => (
  <div className="space-y-8">
    <div className="text-center space-y-2">
      <h1 className="text-2xl font-semibold">
        How do you want to use Dashboard?
      </h1>
      <p className="text-gray-400">This helps us customize your experience</p>
    </div>

    <motion.div className="space-y-4 max-w-2xl mx-auto" variants={listVariants}>
      {purposeOptions.map((option) => (
        <motion.div key={option.id} variants={itemVariants}>
          <Card
            className={`cursor-pointer transition-all duration-200 border-2 hover:bg-primary/10 ${
              selectedUsage === option.id
                ? "border-primary bg-primary/70"
                : "border-black"
            }`}
            onClick={() => handlePurposeSelect(option.id)}
            {...register("purpose")}
          >
            <CardContent className="p-6 flex items-center space-x-4">
              <div>{option.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{option.title}</h3>
                <p>{option.description}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  </div>
);
export default StepTwo;
