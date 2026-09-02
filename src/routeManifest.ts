import type { TripId } from "./tripTypes";

export type RouteView = "dashboard" | "itinerary" | "calendar" | "places" | "discovery" | "journal" | "budget" | "maps" | "more";
export type RouteMode = "plan" | "actual" | undefined;

export interface AppRouteDefinition {
  path: string;
  tripId?: TripId;
  view: RouteView;
  mode?: RouteMode;
  indexable: boolean;
  title: string;
  description: string;
}

export const PRODUCTION_ORIGIN = "https://itinerary-mate.vercel.app";
export const DEFAULT_SOCIAL_IMAGE = `${PRODUCTION_ORIGIN}/og/itinerary-mate-social.png`;

export const appRoutes: AppRouteDefinition[] = [
  {
    path: "/",
    tripId: "japan-2026",
    view: "dashboard",
    indexable: true,
    title: "Japan Trip Planner | Itinerary Mate",
    description: "Plan a thoughtful Japan trip with day-by-day places, route notes, stays, and a rough budget in one local-first workspace.",
  },
  {
    path: "/itinerary",
    tripId: "japan-2026",
    view: "itinerary",
    indexable: true,
    title: "Japan Itinerary | Itinerary Mate",
    description: "Review the Japan itinerary day by day, with places, timing notes, route context, and map links close to the plan.",
  },
  {
    path: "/places",
    tripId: "japan-2026",
    view: "places",
    indexable: true,
    title: "Japan Places to Explore | Itinerary Mate",
    description: "Browse saved Japan places, neighborhoods, food, temples, day trips, and ideas before locking the route.",
  },
  {
    path: "/explore",
    view: "discovery",
    indexable: true,
    title: "Explore Travel Ideas | Itinerary Mate",
    description: "Collect practical travel ideas for islands, hiking, food, road trips, and future itineraries in Itinerary Mate.",
  },
  ...tripRoutes("peru-2026", "Peru", ["dashboard", "itinerary", "calendar", "places"]),
  ...tripRoutes("portugal-2026", "Portugal", ["dashboard", "itinerary", "places", "journal"], "actual"),
  ...tripRoutes("portugal-2026", "Portugal Plan", ["dashboard", "itinerary", "calendar", "places"], "plan", "/trips/portugal-2026/plan"),
  ...utilityRoutes("japan-2026", "Japan", ""),
  ...utilityRoutes("peru-2026", "Peru", "/trips/peru-2026"),
  ...utilityRoutes("portugal-2026", "Portugal", "/trips/portugal-2026"),
  ...utilityRoutes("portugal-2026", "Portugal plan", "/trips/portugal-2026/plan"),
];

function tripRoutes(tripId: TripId, label: string, views: RouteView[], mode?: RouteMode, prefix = `/trips/${tripId}`): AppRouteDefinition[] {
  return views.map((view) => ({
    path: view === "dashboard" ? prefix : `${prefix}/${view}`,
    tripId,
    view,
    mode,
    indexable: true,
    title: `${label}${view === "dashboard" ? "" : ` ${viewLabel(view)}`} | Itinerary Mate`,
    description: descriptionFor(label, view),
  }));
}

function utilityRoutes(tripId: TripId, label: string, prefix: string): AppRouteDefinition[] {
  return (["budget", "maps", "more"] as RouteView[]).map((view) => ({
    path: `${prefix || ""}/${view}`,
    tripId,
    view,
    mode: tripId === "portugal-2026" && prefix.endsWith("/plan") ? "plan" : tripId === "portugal-2026" ? "actual" : undefined,
    indexable: false,
    title: `${label} ${viewLabel(view)} | Itinerary Mate`,
    description: `${viewLabel(view)} tools for the ${label.toLowerCase()} trip in Itinerary Mate.`,
  }));
}

function viewLabel(view: RouteView) {
  return view === "dashboard" ? "Overview" : view === "maps" ? "Map Export" : view[0].toUpperCase() + view.slice(1);
}

function descriptionFor(label: string, view: RouteView) {
  const lower = label.toLowerCase();
  switch (view) {
    case "dashboard": return `See the ${lower} trip at a glance, including its route, next actions, logistics, and planning notes.`;
    case "itinerary": return `Follow the ${lower} trip day by day with places, timing, route context, and useful map links.`;
    case "calendar": return `See the ${lower} trip schedule across dates, flights, stays, route days, and flexible stops.`;
    case "places": return `Browse the saved places and route ideas that make up the ${lower} trip.`;
    case "journal": return `Read the ${lower} trip as an evidence-based travel journal, with visited places and practical spending context.`;
    default: return `Review the ${lower} trip in Itinerary Mate.`;
  }
}

export function routeForPath(pathname: string): AppRouteDefinition | undefined {
  const normalized = normalizePath(pathname);
  return appRoutes.find((route) => route.path === normalized);
}

export function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname || "/";
}

export function appRouteUrl(route: AppRouteDefinition) {
  return route.path === "/" ? "/" : route.path;
}

export type { TripId };
