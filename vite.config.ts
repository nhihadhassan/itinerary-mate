import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { metadataForRoute } from "./src/metadata";
import type { PageMetadata } from "./src/metadata";
import { appRoutes, PRODUCTION_ORIGIN } from "./src/routeManifest";

const DIST_DIR = join(process.cwd(), "dist");

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function withMetadata(template: string, route: PageMetadata) {
  const replacements: Record<string, string> = {
    title: escapeHtml(route.title),
    description: escapeHtml(route.description),
    robots: route.robots,
    ogTitle: escapeHtml(route.ogTitle),
    ogDescription: escapeHtml(route.ogDescription),
    ogUrl: escapeHtml(route.ogUrl),
    ogImage: escapeHtml(route.ogImage),
    ogImageAlt: escapeHtml(route.ogImageAlt),
    canonical: escapeHtml(route.canonical),
    jsonLd: JSON.stringify(route.jsonLd).replace(/</g, "\\u003c"),
  };
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${replacements.title}</title>`)
    .replace(/(<meta\s+name="description"[^>]*content=")[^"]*(")/s, `$1${replacements.description}$2`)
    .replace(/(<meta\s+name="robots"[^>]*content=")[^"]*(")/s, `$1${replacements.robots}$2`)
    .replace(/(<meta\s+property="og:title"[^>]*content=")[^"]*(")/s, `$1${replacements.ogTitle}$2`)
    .replace(/(<meta\s+property="og:description"[^>]*content=")[^"]*(")/s, `$1${replacements.ogDescription}$2`)
    .replace(/(<meta\s+property="og:url"[^>]*content=")[^"]*(")/s, `$1${replacements.ogUrl}$2`)
    .replace(/(<meta\s+property="og:image"[^>]*content=")[^"]*(")/s, `$1${replacements.ogImage}$2`)
    .replace(/(<meta\s+property="og:image:alt"[^>]*content=")[^"]*(")/s, `$1${replacements.ogImageAlt}$2`)
    .replace(/(<meta\s+name="twitter:title"[^>]*content=")[^"]*(")/s, `$1${replacements.ogTitle}$2`)
    .replace(/(<meta\s+name="twitter:description"[^>]*content=")[^"]*(")/s, `$1${replacements.ogDescription}$2`)
    .replace(/(<meta\s+name="twitter:image"[^>]*content=")[^"]*(")/s, `$1${replacements.ogImage}$2`)
    .replace(/(<link\s+rel="canonical"[^>]*href=")[^"]*(")/s, `$1${replacements.canonical}$2`)
    .replace(/<script type="application\/ld\+json" data-itinerary-mate-jsonld="true">[^<]*<\/script>/, `<script type="application/ld+json" data-itinerary-mate-jsonld="true">${replacements.jsonLd}</script>`);
}

function staticSeoPages() {
  return {
    name: "itinerary-mate-static-seo-pages",
    async closeBundle() {
      const template = await readFile(join(DIST_DIR, "index.html"), "utf8");
      for (const route of appRoutes) {
        const metadata = metadataForRoute(route);
        const outputPath = route.path === "/" ? join(DIST_DIR, "index.html") : join(DIST_DIR, `${route.path}.html`);
        await mkdir(join(outputPath, ".."), { recursive: true });
        await writeFile(outputPath, withMetadata(template, metadata));
      }

      const notFound = metadataForRoute({
        path: "/404",
        view: "dashboard",
        indexable: false,
        title: "Page not found | Itinerary Mate",
        description: "The requested Itinerary Mate page could not be found.",
      });
      await writeFile(join(DIST_DIR, "404.html"), withMetadata(template, notFound));
      await writeFile(join(DIST_DIR, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${PRODUCTION_ORIGIN}/sitemap.xml\n`);
      const urls = appRoutes.filter((route) => route.indexable).map((route) => `  <url><loc>${PRODUCTION_ORIGIN}${route.path === "/" ? "/" : route.path}</loc></url>`).join("\n");
      await writeFile(join(DIST_DIR, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
    },
  };
}

export default defineConfig({
  plugins: [react(), staticSeoPages()],
  build: {
    sourcemap: false,
  },
});
