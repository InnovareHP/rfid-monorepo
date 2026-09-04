import type { BlastBlock } from "../blast-block-schema";
import { surfaceToCss } from "../blast-block-style";

type ImageBlockProps = { block: Extract<BlastBlock, { type: "IMAGE" }> };

export const ImageBlock = ({ block }: ImageBlockProps) => {
  const { src, alt, caption } = block.props;

  return (
    <div className="px-6 py-6" style={surfaceToCss(block.props)}>
      <img
        src={src}
        alt={alt ?? ""}
        className="mx-auto block w-full rounded-xl"
        decoding="async"
      />
      {caption && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {caption}
        </p>
      )}
    </div>
  );
};
