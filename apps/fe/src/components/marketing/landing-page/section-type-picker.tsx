import type { LandingSection } from "@/services/marketing/landing-page-service";
import {
  AlignLeft,
  Heading,
  Image,
  MousePointerClick,
  Rows3,
} from "lucide-react";
import type { ComponentType } from "react";

const SECTION_TYPES: {
  type: LandingSection["type"];
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { type: "HERO", label: "Hero", icon: Heading },
  { type: "TEXT", label: "Text", icon: AlignLeft },
  { type: "IMAGE", label: "Image", icon: Image },
  { type: "FORM_EMBED", label: "Form Embed", icon: Rows3 },
  { type: "CTA", label: "Call to Action", icon: MousePointerClick },
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
    <div className="grid grid-cols-2 gap-3">
      {SECTION_TYPES.map(({ type, label, icon: Icon }) => {
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
              disabled ? "This page already has a form embed section" : undefined
            }
            onClick={() => onAdd(type)}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 px-3 py-6 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <Icon className="h-7 w-7 text-gray-700" />
            <span className="text-center leading-tight">{label}</span>
          </button>
        );
      })}
    </div>
  );
};
