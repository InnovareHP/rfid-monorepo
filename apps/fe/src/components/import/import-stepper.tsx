import { Spinner } from "@dashboard/ui/components/spinner";
import { cn } from "@dashboard/ui/lib/utils";
import { Fragment } from "react";

const IMPORT_STEPS = [
  { title: "Upload File", caption: "Add your CSV or Excel file" },
  { title: "Review Data", caption: "Map columns and validate" },
  { title: "Import", caption: "Sync and complete" },
];

type Props = { currentStep: number; isUploading: boolean };

export function ImportStepper({ currentStep, isUploading }: Props) {
  return (
    <div className="flex items-center gap-4">
      {IMPORT_STEPS.map((step, index) => (
        <Fragment key={step.title}>
          {index > 0 && (
            <div
              className={cn(
                "h-px flex-1 transition-colors duration-300",
                index < currentStep ? "bg-primary" : "bg-muted-foreground"
              )}
            />
          )}
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full text-base font-semibold text-primary-foreground transition-colors duration-300",
                index < currentStep ? "bg-primary" : "bg-muted-foreground"
              )}
            >
              {index + 1 === currentStep && isUploading ? (
                <Spinner size="sm" className="text-primary-foreground" />
              ) : (
                index + 1
              )}
            </span>
            <div>
              <p className="text-lg font-semibold text-foreground">
                {step.title}
              </p>
              <p className="text-sm text-muted-foreground">{step.caption}</p>
            </div>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
