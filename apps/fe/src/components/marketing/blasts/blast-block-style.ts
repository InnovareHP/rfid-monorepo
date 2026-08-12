import type { BlastBlock, BlastTextStyle } from "./blast-block-schema";
import type { CSSProperties } from "react";

export const FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Courier New",
] as const;

// Author-chosen colors and sizes are runtime values, so they stay inline rather
// than becoming Tailwind tokens.
export const textStyleToCss = (
  style: BlastTextStyle | undefined,
  fallbackSize: number
): CSSProperties => ({
  fontFamily: style?.fontFamily ?? "Arial, Helvetica, sans-serif",
  fontSize: style?.fontSize ?? fallbackSize,
  color: style?.color ?? "#202020",
  textAlign: style?.align ?? "center",
});

export const surfaceToCss = (props: BlastBlock["props"]): CSSProperties => ({
  backgroundColor: props.backgroundColor,
  backgroundImage: props.backgroundImage
    ? `url('${props.backgroundImage}')`
    : undefined,
  backgroundSize: "cover",
  backgroundPosition: "center",
});
