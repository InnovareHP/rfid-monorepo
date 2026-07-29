import type { HeroSection as HeroSectionType } from "@/services/marketing/landing-page-service";

type HeroSectionProps = { section: HeroSectionType };

export const HeroSection = ({ section }: HeroSectionProps) => {
  const { heading, subheading, imageSrc, ctaLabel, ctaHref } = section.props;

  return (
    <section className="py-16 px-6 text-center space-y-4">
      {imageSrc && (
        <img
          src={imageSrc}
          alt=""
          className="mx-auto max-h-64 object-contain"
        />
      )}
      <h1 className="text-3xl font-bold text-gray-900">{heading}</h1>
      {subheading && <p className="text-lg text-gray-500">{subheading}</p>}
      {ctaLabel && ctaHref && (
        <a
          href={ctaHref}
          className="inline-block rounded-md bg-gray-900 px-6 py-3 text-white text-sm font-medium"
        >
          {ctaLabel}
        </a>
      )}
    </section>
  );
};
