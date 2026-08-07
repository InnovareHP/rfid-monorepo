import { authClient } from "@/lib/auth-client";
import { pageVariants } from "@/lib/framer";
import { uploadImage } from "@/services/image/image-service";
import { onboardUser } from "@/services/user/user-service";
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
import { Form } from "@dashboard/ui/components/form";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import StepFour from "./onboarding-steps/StepFour";
import StepOne from "./onboarding-steps/StepOne";

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

const OnBoardingPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      foundUsOn: "",
      organizationName: "",
      brandColor: "#3b82f6",
      logoFile: null,
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting, errors },
  } = form;

  const heardUsOptions = [
    {
      id: "facebook",
      title: "Facebook",
      description: "Saw a post, story, or ad",
      icon: <Facebook className="w-8 h-8" />,
    },
    {
      id: "google",
      title: "Google Search",
      description: "Found you via search results",
      icon: <Search className="w-8 h-8" />,
    },
    {
      id: "friend",
      title: "Friend / colleague",
      description: "Word of mouth recommendation",
      icon: <Users className="w-8 h-8" />,
    },
    {
      id: "online-ad",
      title: "Online ad",
      description: "Banner, PPC, or display network",
      icon: <Megaphone className="w-8 h-8" />,
    },
    {
      id: "social-other",
      title: "Other social platform",
      description: "Instagram, TikTok, X, etc.",
      icon: <Globe className="w-8 h-8" />,
    },
    {
      id: "other",
      title: "Something else",
      description: "Podcast, event, flyer…",
      icon: <Circle className="w-8 h-8" />,
    },
  ];

  // const purposeOptions = [
  //   {
  //     id: "work",
  //     title: "For work",
  //     description: "Track projects, company goals, meeting notes",
  //     icon: <Building2 className="w-6 h-6" />,
  //   },
  //   {
  //     id: "personal",
  //     title: "For personal life",
  //     description: "Write better, think more clearly, stay organized",
  //     icon: <Home className="w-6 h-6" />,
  //   },
  //   {
  //     id: "school",
  //     title: "For school",
  //     description: "Keep notes, research, and tasks in one place",
  //     icon: <GraduationCap className="w-6 h-6" />,
  //   },
  // ];

  // const interestOptions = [
  //   {
  //     id: "personal-finance",
  //     label: "Personal finance",
  //     icon: <DollarSign className="w-4 h-4" />,
  //   },
  //   {
  //     id: "habit-tracking",
  //     label: "Habit tracking",
  //     icon: <CheckSquare className="w-4 h-4" />,
  //   },
  //   { id: "hobbies", label: "Hobbies", icon: <User className="w-4 h-4" /> },
  //   { id: "travel", label: "Travel", icon: <MapPin className="w-4 h-4" /> },
  //   {
  //     id: "site-blog",
  //     label: "Site or blog",
  //     icon: <Book className="w-4 h-4" />,
  //   },
  //   {
  //     id: "books-media",
  //     label: "Books and media",
  //     icon: <Book className="w-4 h-4" />,
  //   },
  //   {
  //     id: "project-tracking",
  //     label: "Project tracking",
  //     icon: <Calendar className="w-4 h-4" />,
  //   },
  //   {
  //     id: "food-nutrition",
  //     label: "Food & nutrition",
  //     icon: <Utensils className="w-4 h-4" />,
  //   },
  //   {
  //     id: "todo-list",
  //     label: "To-do list",
  //     icon: <ListTodo className="w-4 h-4" />,
  //   },
  //   {
  //     id: "career-building",
  //     label: "Career building",
  //     icon: <Briefcase className="w-4 h-4" />,
  //   },
  // ];

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
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-4xl relative">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
            <div
              key={step}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                step <= currentStep ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Back button */}
        {currentStep > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <StepOne
                    usageOptions={heardUsOptions}
                    control={form.control}
                    onSelected={handleContinue}
                  />
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <StepFour
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
      </div>
    </div>
  );
};

export default OnBoardingPage;
