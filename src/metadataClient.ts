import type { PageMetadata } from "./metadata";

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let node = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attribute, key);
    document.head.appendChild(node);
  }
  node.content = content;
}

function setCanonical(href: string) {
  let node = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!node) {
    node = document.createElement("link");
    node.rel = "canonical";
    document.head.appendChild(node);
  }
  node.href = href;
}

export function applyMetadata(metadata: PageMetadata) {
  document.title = metadata.title;
  setMeta("name", "description", metadata.description);
  setMeta("name", "robots", metadata.robots);
  setMeta("property", "og:type", "website");
  setMeta("property", "og:title", metadata.ogTitle);
  setMeta("property", "og:description", metadata.ogDescription);
  setMeta("property", "og:url", metadata.ogUrl);
  setMeta("property", "og:image", metadata.ogImage);
  setMeta("property", "og:image:alt", metadata.ogImageAlt);
  setMeta("property", "og:image:type", "image/png");
  setMeta("property", "og:image:width", "1200");
  setMeta("property", "og:image:height", "630");
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", metadata.ogTitle);
  setMeta("name", "twitter:description", metadata.ogDescription);
  setMeta("name", "twitter:image", metadata.ogImage);
  setCanonical(metadata.canonical);

  const existing = document.head.querySelector<HTMLScriptElement>('script[data-itinerary-mate-jsonld="true"]');
  const script = existing || document.createElement("script");
  script.type = "application/ld+json";
  script.dataset.itineraryMateJsonld = "true";
  script.textContent = JSON.stringify(metadata.jsonLd);
  if (!existing) document.head.appendChild(script);
}
