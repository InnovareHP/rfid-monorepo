import type { BlastBlock } from "../blast-block-schema";
import { surfaceToCss } from "../blast-block-style";

type ButtonBlockProps = { block: Extract<BlastBlock, { type: "BUTTON" }> };

export const ButtonBlock = ({ block }: ButtonBlockProps) => (
  <div
    className="px-6 py-6 text-center"
    style={surfaceToCss(block.props)}
  >
    <span
      className="inline-block rounded-md px-5 py-2.5 text-sm font-bold text-brand-foreground"
      style={{ backgroundColor: block.props.buttonColor ?? "#0d3185" }}
    >
      {block.props.label}
    </span>
  </div>
);
