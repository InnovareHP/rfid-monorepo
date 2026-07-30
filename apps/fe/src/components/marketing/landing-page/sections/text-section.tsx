import type { TextSection as TextSectionType } from "@/services/marketing/landing-page-service";

type TextSectionProps = { section: TextSectionType };

export const TextSection = ({ section }: TextSectionProps) => {
  const { heading, body } = section.props;

  return (
    <section className="py-10 px-6 max-w-2xl mx-auto space-y-3">
      {heading && (
        <h2 className="text-xl font-semibold text-gray-900">{heading}</h2>
      )}
      {/* React escapes text content by default — never dangerouslySetInnerHTML here. */}
      <p className="text-sm text-gray-600 whitespace-pre-wrap">{body}</p>
    </section>
  );
};
