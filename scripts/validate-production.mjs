import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const dist = join(root, "dist");
const origin = "https://itinerary-mate.vercel.app";
const indexable = [
  "/", "/itinerary", "/places", "/explore",
  "/trips/peru-2026", "/trips/peru-2026/itinerary", "/trips/peru-2026/calendar", "/trips/peru-2026/places",
  "/trips/portugal-2026", "/trips/portugal-2026/itinerary", "/trips/portugal-2026/places", "/trips/portugal-2026/journal",
  "/trips/portugal-2026/plan", "/trips/portugal-2026/plan/itinerary", "/trips/portugal-2026/plan/calendar", "/trips/portugal-2026/plan/places",
];
const utility = [
  "/budget", "/maps", "/more",
  "/trips/peru-2026/budget", "/trips/peru-2026/maps", "/trips/peru-2026/more",
  "/trips/portugal-2026/budget", "/trips/portugal-2026/maps", "/trips/portugal-2026/more",
  "/trips/portugal-2026/plan/budget", "/trips/portugal-2026/plan/maps", "/trips/portugal-2026/plan/more",
];

function fileFor(pathname) {
  return pathname === "/" ? join(dist, "index.html") : join(dist, `${pathname.slice(1)}.html`);
}

function readHtml(pathname) {
  const file = fileFor(pathname);
  if (!existsSync(file)) throw new Error(`Missing generated route file: ${pathname}`);
  return readFileSync(file, "utf8");
}

function match(html, pattern, label) {
  const result = html.match(pattern)?.[1]?.trim();
  if (!result) throw new Error(`Missing ${label}`);
  return result;
}

const documents = [...indexable, ...utility].map((pathname) => ({ pathname, html: readHtml(pathname) }));
const titles = new Set();
const descriptions = new Set();
for (const { pathname, html } of documents) {
  const title = match(html, /<title>([^<]+)<\/title>/i, `${pathname} title`);
  const description = match(html, /<meta[^>]*name="description"[^>]*content="([^"]+)"/i, `${pathname} description`);
  const canonical = match(html, /<link rel="canonical" href="([^"]+)"/i, `${pathname} canonical`);
  const robots = match(html, /<meta[^>]*name="robots"[^>]*content="([^"]+)"/i, `${pathname} robots`);
  const ogUrl = match(html, /<meta property="og:url" content="([^"]+)"/i, `${pathname} og:url`);
  const jsonLd = match(html, /<script type="application\/ld\+json" data-itinerary-mate-jsonld="true">([\s\S]*?)<\/script>/i, `${pathname} JSON-LD`);
  JSON.parse(jsonLd);
  if (!canonical.startsWith(origin) || !ogUrl.startsWith(origin)) throw new Error(`${pathname} uses a non-production URL`);
  if (!html.includes('property="og:image"') || !html.includes('name="twitter:card"')) throw new Error(`${pathname} is missing social tags`);
  if (indexable.includes(pathname)) {
    if (robots !== "index,follow") throw new Error(`${pathname} is not indexable`);
    if (canonical !== `${origin}${pathname}`) throw new Error(`${pathname} canonical mismatch`);
    titles.add(title);
    descriptions.add(description);
  } else if (robots !== "noindex,nofollow") {
    throw new Error(`${pathname} should be noindex,nofollow`);
  }
}
if (titles.size !== indexable.length || descriptions.size !== indexable.length) throw new Error("Indexable route metadata is not unique");

const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);
const expectedUrls = indexable.map((pathname) => `${origin}${pathname}`);
if (sitemapUrls.length !== expectedUrls.length || expectedUrls.some((url) => !sitemapUrls.includes(url))) throw new Error("Sitemap membership mismatch");
const robots = readFileSync(join(dist, "robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) throw new Error("robots.txt does not reference the production sitemap");
const notFound = readFileSync(join(dist, "404.html"), "utf8");
if (!notFound.includes("Page not found | Itinerary Mate") || !notFound.includes('content="noindex,nofollow"')) throw new Error("Branded 404 metadata is missing");

function findMaps(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? findMaps(path) : entry.name.endsWith(".map") ? [path] : [];
  });
}
if (findMaps(dist).length) throw new Error("Production source maps were emitted");
console.log(`Validated ${documents.length} generated routes, ${sitemapUrls.length} sitemap URLs, robots.txt, JSON-LD, and 404 metadata.`);
