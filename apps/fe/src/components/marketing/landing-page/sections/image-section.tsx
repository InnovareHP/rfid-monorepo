import type { ImageSection as ImageSectionType } from "@/services/marketing/landing-page-service";

type ImageSectionProps = { section: ImageSectionType };

export const ImageSection = ({ section }: ImageSectionProps) => {
  const { src, alt, caption } = section.props;

  return (
    <section className="py-10 px-6 max-w-3xl mx-auto space-y-2">
      <img src={src} alt={alt} className="w-full rounded-lg object-cover" />
      {caption && (
        <p className="text-xs text-gray-400 text-center">{caption}</p>
      )}
    </section>
  );
};
