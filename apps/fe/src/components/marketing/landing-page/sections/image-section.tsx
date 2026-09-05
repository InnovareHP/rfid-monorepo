import type { ImageSection as ImageSectionType } from "@/services/marketing/landing-page-service";

type ImageSectionProps = { section: ImageSectionType };

export const ImageSection = ({ section }: ImageSectionProps) => {
  const { src, alt, caption, ctaLabel, ctaHref } = section.props;

  return (
    <section className="py-10 px-6 max-w-3xl mx-auto space-y-2 text-center">
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg object-cover"
        decoding="async"
      />
      {caption && <p className="text-xs text-gray-400">{caption}</p>}
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
