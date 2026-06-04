export interface OpenPlaceSearchResult {
  name: string;
  address: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
  osmType?: string;
  osmClass?: string;
}

export interface OpenPlaceDetails {
  address?: string;
  city?: string;
  website?: string;
  phone?: string;
  openingHours?: string;
  cuisine?: string;
  categoryHint?: string;
}

export interface OpenRouteEstimate {
  distanceMeters: number;
  durationSeconds: number;
  source: "OSRM";
}

const REQUEST_TIMEOUT_MS = 8000;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Accept-Language": "en",
        ...(init?.headers || {}),
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function searchOpenPlaces(query: string, bias?: { latitude: number; longitude: number }) {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  const biasParams = bias ? `&lat=${bias.latitude.toFixed(4)}&lon=${bias.longitude.toFixed(4)}` : "";
  const photon = await fetchJson<{ features?: Array<{ geometry: { coordinates: [number, number] }; properties?: Record<string, string> }> }>(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=8&lang=en${biasParams}`,
  );
  return (photon?.features || []).map((feature) => {
    const properties = feature.properties || {};
    const [longitude, latitude] = feature.geometry.coordinates;
    const addressParts = [
      properties.name,
      properties.street,
      properties.city || properties.town || properties.village,
      properties.state,
      properties.country,
    ].filter(Boolean);
    return {
      name: properties.name || trimmed,
      address: addressParts.join(", "),
      city: properties.city || properties.town || properties.village,
      country: properties.country,
      latitude,
      longitude,
      osmType: properties.osm_value,
      osmClass: properties.osm_key,
    } satisfies OpenPlaceSearchResult;
  });
}

export async function reverseGeocodeOpenPlace(latitude: number, longitude: number) {
  const data = await fetchJson<{ display_name?: string; address?: Record<string, string> }>(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
  );
  if (!data) return null;
  const address = data.address || {};
  return {
    address: data.display_name,
    city: address.city || address.town || address.village || address.municipality || address.county,
  } satisfies OpenPlaceDetails;
}

export async function fetchOpenPlaceDetails(latitude: number, longitude: number) {
  const radius = 30;
  const query = `
    [out:json][timeout:10];
    (
      nwr(around:${radius},${latitude},${longitude})["name"];
    );
    out tags center 1;
  `;
  const data = await fetchJson<{ elements?: Array<{ tags?: Record<string, string> }> }>("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
  });
  const best = (data?.elements || []).sort((a, b) => Object.keys(b.tags || {}).length - Object.keys(a.tags || {}).length)[0];
  const tags = best?.tags;
  if (!tags) return null;
  const address = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  return {
    address: [address, tags["addr:city"]].filter(Boolean).join(", "),
    city: tags["addr:city"],
    website: tags.website || tags["contact:website"],
    phone: tags.phone || tags["contact:phone"],
    openingHours: tags.opening_hours,
    cuisine: tags.cuisine?.replace(/;/g, ", "),
    categoryHint: tags.tourism || tags.amenity || tags.shop,
  } satisfies OpenPlaceDetails;
}

export async function fetchOsrmRouteEstimate(origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) {
  const data = await fetchJson<{ routes?: Array<{ duration: number; distance: number }> }>(
    `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=false`,
  );
  const route = data?.routes?.[0];
  if (!route) return null;
  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    source: "OSRM",
  } satisfies OpenRouteEstimate;
}
