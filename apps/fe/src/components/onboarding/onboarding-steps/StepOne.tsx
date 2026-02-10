import { Card, CardContent } from "@dashboard/ui/components/card";
import { itemVariants, listVariants } from "@/lib/framer";
import { motion } from "framer-motion";
import type { UseFormRegister } from "react-hook-form";
import { type FormValues } from "../onboarding";

type StepOneProps = {
  usageOptions: {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
  }[];
  selectedUsage: string;
  handleUsageSelect: (usageId: string) => void;
  register: UseFormRegister<FormValues>;
};

const StepOne = ({
  usageOptions,
  selectedUsage,
  handleUsageSelect,
  register,
}: StepOneProps) => (
  <div className="space-y-8 flex flex-col items-center justify-center">
    <div className="text-center space-y-2">
      <h1 className="text-2xl font-semibold">
        How did you hear about Dashboard?
      </h1>
      <p>This helps us customize your experience</p>
    </div>

    <motion.div
      className="flex flex-col sm:flex-row sm:flex-wrap gap-3 max-w-3xl"
      variants={listVariants}
    >
      {usageOptions.map((option) => {
        const isSelected = selectedUsage === option.id;

        return (
          <motion.div key={option.id} variants={itemVariants}>
            <Card
              className={[
                "cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:bg-primary/10",
                isSelected ? "border-primary bg-primary/70" : "border-black",
              ].join(" ")}
              onClick={() => handleUsageSelect(option.id)}
              {...register("foundUsOn")}
            >
              <CardContent className="p-6 text-center space-y-4 min-h-[200px] flex flex-col justify-center">
                <div
                  className={[
                    "flex justify-center",
                    isSelected ? "text-primary-foreground" : "text-black",
                  ].join(" ")}
                >
                  {option.icon}
                </div>

                <div className="space-y-2">
                  <h3
                    className={[
                      "font-semibold",
                      isSelected ? "text-primary-foreground" : "text-black",
                    ].join(" ")}
                  >
                    {option.title}
                  </h3>
                  <p
                    className={[
                      "text-sm leading-relaxed",
                      isSelected ? "text-primary-foreground/90" : "text-black",
                    ].join(" ")}
                  >
                    {option.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  </div>
);

export default StepOne;
