import { ImageUp } from "lucide-react";
import type { ReactNode } from "react";
import type { BlastBlock } from "./blast-block-schema";
import { ButtonBlock } from "./blocks/button-block";
import { FooterBlock } from "./blocks/footer-block";
import { HeadlineBlock } from "./blocks/headline-block";
import { ImageBlock } from "./blocks/image-block";
import { SeparatorBlock } from "./blocks/separator-block";
import { SubscribeBlock } from "./blocks/subscribe-block";
import { TextBlock } from "./blocks/text-block";

type BlastEmailPreviewProps = {
  blocks: BlastBlock[];
  // Editor mode swaps an empty image for a click-to-upload placeholder.
  editing?: boolean;
  wrapBlock?: (block: BlastBlock, node: ReactNode) => ReactNode;
};

export const BlastEmailPreview = ({
  blocks,
  editing = false,
  wrapBlock,
}: BlastEmailPreviewProps) => {
  const renderBlock = (block: BlastBlock): ReactNode => {
    switch (block.type) {
      case "HEADLINE":
        return <HeadlineBlock block={block} />;
      case "TEXT":
        return <TextBlock block={block} />;
      case "IMAGE":
        if (editing && !block.props.src) {
          return (
            <div className="m-6 flex flex-col items-center justify-center gap-1 py-12 text-center">
              <ImageUp className="size-8 text-muted-foreground" />
              <p className="text-sm text-foreground">No Image Set</p>
              <p className="text-xs text-muted-foreground">Click to upload</p>
            </div>
          );
        }
        return <ImageBlock block={block} />;
      case "SEPARATOR":
        return <SeparatorBlock block={block} />;
      case "FOOTER":
        return <FooterBlock block={block} />;
      case "SUBSCRIBE":
        return <SubscribeBlock block={block} />;
      case "BUTTON":
        return <ButtonBlock block={block} />;
    }
  };

  return (
    <div className="overflow-hidden rounded-xl bg-card">
      {blocks.map((block) => {
        const node = renderBlock(block);
        return (
          <div key={block.id}>
            {wrapBlock ? wrapBlock(block, node) : node}
          </div>
        );
      })}
    </div>
  );
};
