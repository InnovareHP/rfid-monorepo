import { DashboardChoice } from "@/components/dashboard-choice";
import { itemVariants, listVariants } from "@/lib/framer";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@dashboard/ui/components/form";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { Control } from "react-hook-form";
import { type FormValues } from "../onboarding";

type StepSourceProps = {
  sourceOptions: {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
  }[];
  control: Control<FormValues>;
  onSelected: () => void;
};

const StepSource = ({ sourceOptions, control, onSelected }: StepSourceProps) => (
  <div className="space-y-6">
    <div className="space-y-1 text-center">
      <h2 className="text-2xl xl:text-3xl font-bold text-brand">
        How did you hear about Refidly?
      </h2>
      <p className="text-sm xl:text-base text-muted-foreground">
        This helps us tailor your workspace.
      </p>
    </div>

    <FormField
      control={control}
      name="foundUsOn"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <motion.div
              className="flex flex-col gap-3"
              variants={listVariants}
              initial="initial"
              animate="animate"
            >
              {sourceOptions.map((option) => (
                <motion.div key={option.id} variants={itemVariants}>
                  <DashboardChoice
                    icon={option.icon}
                    title={option.title}
                    description={option.description}
                    selected={field.value === option.id}
                    onClick={() => {
                      field.onChange(option.id);
                      onSelected();
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);

export default StepSource;
