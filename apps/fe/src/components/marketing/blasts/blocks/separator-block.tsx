import type { BlastBlock } from "../blast-block-schema";
import { surfaceToCss } from "../blast-block-style";

type SeparatorBlockProps = {
  block: Extract<BlastBlock, { type: "SEPARATOR" }>;
};

export const SeparatorBlock = ({ block }: SeparatorBlockProps) => (
  <div className="px-6 py-4" style={surfaceToCss(block.props)}>
    <hr style={{ borderTopColor: block.props.color ?? "#e4e4e7" }} />
  </div>
);
