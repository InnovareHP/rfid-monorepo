import type { BlastBlock } from "../blast-block-schema";
import { surfaceToCss, textStyleToCss } from "../blast-block-style";

type SubscribeBlockProps = { block: Extract<BlastBlock, { type: "SUBSCRIBE" }> };

export const SubscribeBlock = ({ block }: SubscribeBlockProps) => {
  const { description, descriptionStyle, label, buttonColor, textColor } =
    block.props;

  return (
    <div className="px-6 py-6 text-center" style={surfaceToCss(block.props)}>
      {description && (
        <p
          className="mb-3"
          style={textStyleToCss(descriptionStyle, 16)}
        >
          {description}
        </p>
      )}
      <span
        className="inline-block rounded-md px-5 py-2.5 text-sm font-bold"
        style={{
          backgroundColor: buttonColor ?? "#0d3185",
          color: textColor ?? "#ffffff",
        }}
      >
        {label}
      </span>
    </div>
  );
};
