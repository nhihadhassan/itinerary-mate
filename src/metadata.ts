import type { AppRouteDefinition } from "./routeManifest";
import { DEFAULT_SOCIAL_IMAGE, PRODUCTION_ORIGIN } from "./routeManifest";

const DESCRIPTION_FALLBACK = "A local-first workspace for planning, carrying, and reviewing personal travel.";

export interface PageMetadata {
  title: string;
  description: string;
  canonical: string;
  robots: "index,follow" | "noindex,nofollow";
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogImage: string;
  ogImageAlt: string;
  jsonLd: Record<string, unknown>;
}

export function metadataForRoute(route: AppRouteDefinition): PageMetadata {
  const canonicalPath = route.path === "/" ? "/" : route.path;
  const canonical = `${PRODUCTION_ORIGIN}${canonicalPath}`;
  const description = route.description || DESCRIPTION_FALLBACK;
  return {
    title: route.title,
    description,
    canonical,
    robots: route.indexable ? "index,follow" : "noindex,nofollow",
    ogTitle: route.title,
    ogDescription: description,
    ogUrl: canonical,
    ogImage: DEFAULT_SOCIAL_IMAGE,
    ogImageAlt: "Itinerary Mate route map and trip planning workspace",
    jsonLd: route.path === "/"
      ? {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: "Itinerary Mate",
              url: PRODUCTION_ORIGIN,
              description,
            },
            {
              "@type": "SoftwareApplication",
              name: "Itinerary Mate",
              url: PRODUCTION_ORIGIN,
              applicationCategory: "TravelApplication",
              operatingSystem: "Any",
              description: "A local-first multi-trip planner for places, routes, stays, budgets, and travel notes.",
            },
          ],
        }
      : {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: route.title,
          url: canonical,
          description,
          isPartOf: { "@type": "WebSite", name: "Itinerary Mate", url: PRODUCTION_ORIGIN },
        },
  };
}
