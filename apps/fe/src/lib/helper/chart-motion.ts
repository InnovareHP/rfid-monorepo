// One motion setting for every recharts series, so a pie and a bar on the same
// page cannot animate at different speeds. Recharts defaults to 1500ms 'ease',
// which reads as sluggish and replays in full on every filter change.
//
// Read once at module load: recharts drives these frames in JS, so re-reading
// the query per render would cost more than it saves. The charts load in their
// own chunk, well after the media query is answerable. matchMedia is checked
// separately from window because a test environment defines one and not the
// other, and at module load an unguarded call takes the chart chunk with it.
const PREFERS_REDUCED_MOTION =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 420ms out-eases the sweep without holding the frame budget long enough for a
// filter change to feel blocked. Labels and dots re-render per frame, so the
// duration is the cost, not the easing.
const DURATION = 420;

export const CHART_MOTION = {
  isAnimationActive: !PREFERS_REDUCED_MOTION,
  animationBegin: 0,
  animationDuration: DURATION,
  animationEasing: "ease-out",
} as const;

// A thumbnail sits in a grid of five or more, so they all animate at once.
export const CHART_MOTION_COMPACT = {
  ...CHART_MOTION,
  animationDuration: 260,
} as const;

export const chartMotion = (compact = false) =>
  compact ? CHART_MOTION_COMPACT : CHART_MOTION;
