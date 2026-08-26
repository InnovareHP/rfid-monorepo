import type { APIRoute } from "astro";

// Routes are derived from the pages directory so the sitemap cannot go stale.
const ROUTES = Object.keys(import.meta.glob("./**/*.astro"))
  .map((path) => path.replace(/^\.\//, "").replace(/(index)?\.astro$/, ""))
  .map((slug) => `/${slug}`)
  .sort();

export const GET: APIRoute = ({ site }) => {
  const urls = ROUTES.map(
    (route) =>
      `  <url><loc>${site!.origin}${route}</loc><priority>${route === "/" ? "1.0" : "0.7"}</priority></url>`,
  ).join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml" } },
  );
};
