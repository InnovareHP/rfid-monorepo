import { sanitizeRichText } from "@dashboard/shared";
import type { BlastBlock } from "../blast-block-schema";
import { surfaceToCss, textStyleToCss } from "../blast-block-style";

type TextBlockProps = { block: Extract<BlastBlock, { type: "TEXT" }> };

export const TextBlock = ({ block }: TextBlockProps) => {
  const { heading, headingStyle, body, bodyStyle } = block.props;

  return (
    <div className="space-y-2 px-6 py-8" style={surfaceToCss(block.props)}>
      {heading && (
        <div
          style={textStyleToCss(headingStyle, 20)}
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(heading) }}
        />
      )}
      <div
        style={textStyleToCss(bodyStyle, 16)}
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(body) }}
      />
    </div>
  );
};
