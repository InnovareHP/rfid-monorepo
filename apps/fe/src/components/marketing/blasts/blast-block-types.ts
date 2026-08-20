import {
  AlignLeft,
  Heading,
  Image,
  MailPlus,
  MousePointerClick,
  PanelBottom,
  UnfoldVertical,
} from "lucide-react";
import type { ComponentType } from "react";
import type { BlastBlockType } from "./blast-block-schema";

// Order and labels of the Content panel, reused as the block panel headings.
export const BLOCK_TYPES: {
  type: BlastBlockType;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { type: "HEADLINE", label: "Headline", icon: Heading },
  { type: "TEXT", label: "Text", icon: AlignLeft },
  { type: "IMAGE", label: "Image", icon: Image },
  { type: "SEPARATOR", label: "Separator", icon: UnfoldVertical },
  { type: "BUTTON", label: "Button", icon: MousePointerClick },
  { type: "SUBSCRIBE", label: "Subscribe", icon: MailPlus },
  { type: "FOOTER", label: "Footer", icon: PanelBottom },
];
