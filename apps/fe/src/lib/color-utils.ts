export function hexToOklch(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lr = toLinear(r),
    lg = toLinear(g),
    lb = toLinear(b);

  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l = Math.cbrt(l_),
    m = Math.cbrt(m_),
    s = Math.cbrt(s_);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bOk = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const C = Math.sqrt(a * a + bOk * bOk);
  let H = (Math.atan2(bOk, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(3)})`;
}

function getForeground(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return luminance > 0.5
    ? "oklch(0.21 0.006 285.885)"
    : "oklch(0.97 0.014 254.604)";
}

const BRAND_VARS = [
  "--primary",
  "--ring",
  "--sidebar-primary",
  "--sidebar-ring",
  "--primary-foreground",
  "--sidebar-primary-foreground",
] as const;

export function applyBrandColor(hex: string) {
  const oklch = hexToOklch(hex);
  const foreground = getForeground(hex);
  const el = document.documentElement;

  el.style.setProperty("--primary", oklch);
  el.style.setProperty("--ring", oklch);
  el.style.setProperty("--sidebar-primary", oklch);
  el.style.setProperty("--sidebar-ring", oklch);
  el.style.setProperty("--primary-foreground", foreground);
  el.style.setProperty("--sidebar-primary-foreground", foreground);
}

export function removeBrandColor() {
  const el = document.documentElement;
  for (const v of BRAND_VARS) {
    el.style.removeProperty(v);
  }
}
