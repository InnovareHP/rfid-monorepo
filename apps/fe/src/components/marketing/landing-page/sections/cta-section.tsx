import type { CtaSection as CtaSectionType } from "@/services/marketing/landing-page-service";

type CtaSectionProps = { section: CtaSectionType };

export const CtaSection = ({ section }: CtaSectionProps) => {
  const { heading, buttonLabel, href } = section.props;

  return (
    <section className="py-12 px-6 text-center space-y-4 bg-gray-50">
      {heading && (
        <h2 className="text-2xl font-semibold text-gray-900">{heading}</h2>
      )}
      <a
        href={href}
        className="inline-block rounded-md bg-gray-900 px-6 py-3 text-white text-sm font-medium"
      >
        {buttonLabel}
      </a>
    </section>
  );
};
