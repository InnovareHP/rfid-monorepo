import { CtaSection } from "@/components/marketing/landing-page/sections/cta-section";
import { FormEmbedSection } from "@/components/marketing/landing-page/sections/form-embed-section";
import { HeroSection } from "@/components/marketing/landing-page/sections/hero-section";
import { ImageSection } from "@/components/marketing/landing-page/sections/image-section";
import { TextSection } from "@/components/marketing/landing-page/sections/text-section";
import type {
  LandingSection,
  PublicEmbeddedForm,
} from "@/services/marketing/landing-page-service";
import { ImageUp, Rows3 } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

type PlaceholderProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  dashed?: boolean;
};

const Placeholder = ({ icon: Icon, title, hint, dashed }: PlaceholderProps) => (
  <div
    className={`m-6 flex flex-col items-center justify-center gap-1 rounded-lg py-12 text-center ${
      dashed ? "border border-dashed border-blue-200 bg-blue-50/50" : ""
    }`}
  >
    <Icon className="h-8 w-8 text-gray-400" />
    <p className="text-sm text-gray-600">{title}</p>
    <p className="text-xs text-gray-400">{hint}</p>
  </div>
);

type LandingPagePreviewProps = {
  sections: LandingSection[];
  embeddedForm: PublicEmbeddedForm | null;
  // Editor mode swaps unfilled sections for click-to-fill placeholders.
  editing?: boolean;
  embeddedFormName?: string | null;
  wrapSection?: (section: LandingSection, node: ReactNode) => ReactNode;
};

export const LandingPagePreview = ({
  sections,
  embeddedForm,
  editing = false,
  embeddedFormName = null,
  wrapSection,
}: LandingPagePreviewProps) => {
  const renderSection = (section: LandingSection): ReactNode => {
    switch (section.type) {
      case "HERO":
        return <HeroSection section={section} />;
      case "TEXT":
        return <TextSection section={section} />;
      case "IMAGE":
        if (editing && !section.props.src) {
          return (
            <Placeholder
              icon={ImageUp}
              title="No Image Set"
              hint="Click to upload"
            />
          );
        }
        return <ImageSection section={section} />;
      case "FORM_EMBED":
        if (editing) {
          return (
            <Placeholder
              icon={Rows3}
              dashed
              title={embeddedFormName ?? "No Embedded Form"}
              hint={embeddedFormName ? "Embedded form" : "Click to embed"}
            />
          );
        }
        return (
          <FormEmbedSection section={section} embeddedForm={embeddedForm} />
        );
      case "CTA":
        return <CtaSection section={section} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white">
      {sections.map((section) => {
        const node = renderSection(section);
        return (
          <div key={section.id}>
            {wrapSection ? wrapSection(section, node) : node}
          </div>
        );
      })}
    </div>
  );
};
