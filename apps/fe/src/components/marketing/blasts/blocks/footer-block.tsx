import type { BlastBlock } from "../blast-block-schema";
import { surfaceToCss, textStyleToCss } from "../blast-block-style";

type FooterBlockProps = { block: Extract<BlastBlock, { type: "FOOTER" }> };

export const FooterBlock = ({ block }: FooterBlockProps) => {
  const {
    text,
    unsubscribeLabel,
    showSubscribe,
    subscribeLabel,
    subscribeAsButton,
    textStyle,
  } = block.props;
  const subscribeText = subscribeLabel || "Subscribe to these emails";

  return (
    <div
      className="border-t border-border px-6 py-5"
      style={surfaceToCss(block.props)}
    >
      {showSubscribe &&
        (subscribeAsButton ? (
          <p className="mb-3 text-center">
            <span className="inline-block rounded-md bg-brand px-4 py-2 text-[13px] font-bold text-brand-foreground">
              {subscribeText}
            </span>
          </p>
        ) : (
          <p className="mb-2 text-center text-xs font-bold text-info">
            {subscribeText}
          </p>
        ))}
      {text && <p style={textStyleToCss(textStyle, 12)}>{text}</p>}
      <p className="text-center text-[10px] font-bold text-info">
        {unsubscribeLabel || "Unsubscribe from these emails"}
      </p>
    </div>
  );
};
