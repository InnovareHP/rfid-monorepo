import type { LandingSection } from "@/services/marketing/landing-page-service";
import { Plus } from "lucide-react";

const SECTION_TYPES: { type: LandingSection["type"]; label: string }[] = [
  { type: "HERO", label: "Hero" },
  { type: "TEXT", label: "Text" },
  { type: "IMAGE", label: "Image" },
  { type: "FORM_EMBED", label: "Form embed" },
  { type: "CTA", label: "Call to action" },
];

type SectionTypePickerProps = {
  hasFormEmbed: boolean;
  onAdd: (type: LandingSection["type"]) => void;
};

export const SectionTypePicker = ({
  hasFormEmbed,
  onAdd,
}: SectionTypePickerProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Add section</h3>
      <div className="space-y-1">
        {SECTION_TYPES.map(({ type, label }) => {
          // A page can only embed one form, since the embed always resolves
          // to LandingPage.formId — hide the second option instead of
          // letting the user hit a server-side rejection.
          const disabled = type === "FORM_EMBED" && hasFormEmbed;

          return (
            <button
              key={type}
              type="button"
              disabled={disabled}
              title={
                disabled
                  ? "This page already has a form embed section"
                  : undefined
              }
              onClick={() => onAdd(type)}
              className="w-full flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <span className="truncate">{label}</span>
              <Plus className="h-4 w-4 text-gray-400 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
