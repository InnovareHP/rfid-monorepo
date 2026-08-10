import { AuthPanel } from "@/components/auth-panel";
import { authClient } from "@/lib/auth-client";
import { pageVariants } from "@/lib/framer";
import { uploadImage } from "@/services/image/image-service";
import { onboardUser } from "@/services/user/user-service";
import { Button } from "@dashboard/ui/components/button";
import { Form } from "@dashboard/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Circle,
  Facebook,
  Globe,
  Megaphone,
  Search,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import StepOrganization from "./onboarding-steps/step-organization";
import StepSource from "./onboarding-steps/step-source";

const onboardingSchema = z.object({
  foundUsOn: z.string().min(1, "Tell us how you found us"),
  organizationName: z.string().trim().min(1, "Organization name is required"),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a six digit hex colour"),
  logoFile: z.instanceof(File).nullable(),
});

export type FormValues = z.infer<typeof onboardingSchema>;

const TOTAL_STEPS = 2;

const SOURCE_OPTIONS = [
  {
    id: "facebook",
    title: "Facebook",
    description: "Saw a post, story, or ad",
    icon: Facebook,
  },
  {
    id: "google",
    title: "Google Search",
    description: "Found us via search results",
    icon: Search,
  },
  {
    id: "friend",
    title: "Friend / colleague",
    description: "Word of mouth recommendation",
    icon: Users,
  },
  {
    id: "online-ad",
    title: "Online ad",
    description: "Banner, PPC, or display network",
    icon: Megaphone,
  },
  {
    id: "social-other",
    title: "Other social platform",
    description: "Instagram, TikTok, X, etc.",
    icon: Globe,
  },
  {
    id: "other",
    title: "Something else",
    description: "Podcast, event, referral partner",
    icon: Circle,
  },
];

const OnBoardingPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      foundUsOn: "",
      organizationName: "",
      brandColor: "#0d3185",
      logoFile: null,
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting, errors },
  } = form;

  const handleContinue = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      let logo: string | undefined;

      if (data.logoFile) {
        setProgress("Uploading your logo");
        const uploadRes = await uploadImage(data.logoFile, "public");
        logo = uploadRes.url;
      }

      const organizationId = await onboardUser(
        {
          foundUsOn: data.foundUsOn,
          organizationName: data.organizationName.trim(),
          brandColor: data.brandColor,
          logo,
        },
        setProgress
      );

      await authClient.organization.setActive({ organizationId });

      window.location.href = `/${organizationId}`;
    } catch (err: unknown) {
      setProgress("");
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong during onboarding.";
      form.setError("root", { message });
    }
  };

  return (
    <AuthPanel>
      <div className="flex items-center justify-between gap-4 mb-6">
        {currentStep > 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="-ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">
            Step {currentStep} of {TOTAL_STEPS}
          </span>
        )}

        <div className="flex gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
            <span
              key={step}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                step <= currentStep ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step-source"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <StepSource
                  sourceOptions={SOURCE_OPTIONS}
                  control={form.control}
                  onSelected={handleContinue}
                />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-organization"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <StepOrganization
                  control={form.control}
                  isSubmitting={isSubmitting}
                  progress={progress}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {errors.root && (
            <p className="mt-4 text-center text-sm text-destructive">
              {errors.root.message}
            </p>
          )}
        </form>
      </Form>
    </AuthPanel>
  );
};

export default OnBoardingPage;
