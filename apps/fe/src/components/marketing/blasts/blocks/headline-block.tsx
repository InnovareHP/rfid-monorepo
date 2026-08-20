import { sanitizeRichText } from "@dashboard/shared";
import type { BlastBlock } from "../blast-block-schema";
import { surfaceToCss, textStyleToCss } from "../blast-block-style";

type HeadlineBlockProps = { block: Extract<BlastBlock, { type: "HEADLINE" }> };

export const HeadlineBlock = ({ block }: HeadlineBlockProps) => {
  const { heading, headingStyle, subheading, subheadingStyle, logo } =
    block.props;

  return (
    <div className="px-6 py-8" style={surfaceToCss(block.props)}>
      {logo && (
        <img src={logo} alt="" className="mx-auto mb-4 block max-w-[180px]" />
      )}
      {/* Editor output, whitelisted to inline markup by the shared sanitizer. */}
      <div
        style={textStyleToCss(headingStyle, 32)}
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(heading) }}
      />
      {subheading && (
        <div
          className="mt-2"
          style={textStyleToCss(subheadingStyle, 16)}
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(subheading) }}
        />
      )}
    </div>
  );
};
