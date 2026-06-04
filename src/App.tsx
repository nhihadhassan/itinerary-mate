import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  BadgeCheck,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clipboard,
  CloudRain,
  Download,
  FileText,
  GripVertical,
  Hotel,
  Import,
  Bookmark,
  Map as MapIcon,
  MapPin,
  Moon,
  Plane,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  Train,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  Activity,
  Category,
  DEFAULT_CAD_TO_JPY,
  StayArea,
  TripBranch,
  categories as japanCategories,
  defaultActivities,
  defaultStayAreas,
  reasonBuckets,
  routeMoves,
  tripAnchors,
} from "./japanItinerary";
import { peruDayRouteSummaries, peruRouteSuggestions, peruTrip } from "./peruItinerary";
import { portugalDayRouteSummaries, portugalRegionCalendar, portugalRouteSuggestions, portugalTrip } from "./portugalItinerary";
import { japanExploreKinds, japanExplorePlaces } from "./japanExplore";
import type { JapanExploreKind, JapanExplorePlace } from "./japanExplore";
import { discoveryKinds, discoveryPlaces, discoveryWindows } from "./discoveryPlaces";
import type { DiscoveryKind, DiscoveryPlace, DiscoveryWindow } from "./discoveryPlaces";
import { searchOpenPlaces } from "./lib/openMapServices";
import type { OpenPlaceSearchResult } from "./lib/openMapServices";
import type { RouteSuggestion, Trip, TripActivity, TripAttachment, TripCategory, TripFlight, TripHotel, TripId } from "./tripTypes";

type AppView = "dashboard" | "itinerary" | "calendar" | "places" | "discovery" | "budget" | "maps" | "more";
type ThemePreference = "light" | "dark";

interface LegacyJapanState {
  version: 1;
  activities: Activity[];
  branch: TripBranch;
  cadToJpy: number;
  stayAreas: StayArea[];
  updatedAt: string;
}

interface MultiTripState {
  version: 2;
  activeTripId: TripId;
  trips: Record<TripId, Trip>;
  japanBranch: TripBranch;
  japanCadToJpy: number;
  themePreference: ThemePreference;
  updatedAt: string;
}

interface BudgetRange {
  low: number;
  mid: number;
  high: number;
}

const MULTI_STORAGE_KEY = "itinerary-mate-v2";
const LEGACY_JAPAN_STORAGE_KEY = "september-japan-planner-v1";
const CHECKLIST_STORAGE_KEY = "itinerary-mate-checklists-v1";
const tripOrder: TripId[] = ["japan-2026", "peru-2026", "portugal-2026"];
const calendarTripIds = new Set<TripId>(["peru-2026", "portugal-2026"]);
const bookedTripIds = new Set<TripId>(["peru-2026", "portugal-2026"]);

const baseNavItems: Array<{ id: AppView; label: string }> = [
  { id: "dashboard", label: "Overview" },
  { id: "itinerary", label: "Itinerary" },
  { id: "places", label: "Explore" },
  { id: "budget", label: "Budget" },
  { id: "maps", label: "Map / Export" },
  { id: "more", label: "Resources" },
];

const categoryOptions: TripCategory[] = [
  "Must See",
  "Non-Negotiable",
  "Nice To Have",
  "Extra",
  "Flight",
  "Hotel",
  "Food",
  "Transit",
  "Note",
];

interface ChecklistItem {
  id: string;
  tripId: TripId;
  text: string;
  isDone: boolean;
  archivedAt?: string;
}

function placeholderFor(text: string) {
  const hue = Math.abs([...text].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 360;
  return `linear-gradient(135deg, hsl(${hue} 45% 84%) 0%, hsl(${(hue + 42) % 360} 38% 92%) 52%, hsl(${(hue + 118) % 360} 35% 87%) 100%)`;
}

function isImageUrl(url?: string) {
  if (!url) return false;
  return /^(https?:\/\/|\/)/.test(url) && !url.startsWith("linear-gradient");
}

function placeInitials(title: string) {
  const words = title.replace(/[^\p{L}\p{N}\s']/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "IM";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function visualKicker(activity: TripActivity) {
  return activity.region || activity.city || activity.country || activity.category;
}

function parseStored<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : null;
  } catch {
    return null;
  }
}

function normalizeThemePreference(value: unknown): ThemePreference {
  return value === "dark" ? "dark" : "light";
}

function hydrateJapanActivities(activities: Activity[]) {
  const defaultsById = new Map(defaultActivities.map((activity) => [activity.id, activity]));
  return activities.map((activity) => {
    const fallback = defaultsById.get(activity.id);
    return {
      ...activity,
      imageUrl: activity.imageUrl || fallback?.imageUrl || "",
      imageAlt: activity.imageAlt || fallback?.imageAlt || `Image-style placeholder for ${activity.title}.`,
      imageCredit: activity.imageCredit || fallback?.imageCredit,
      imageCreditUrl: activity.imageCreditUrl || fallback?.imageCreditUrl,
      imageLicense: activity.imageLicense || fallback?.imageLicense,
      imageSearchQuery: activity.imageSearchQuery || fallback?.imageSearchQuery || `${activity.title} ${activity.city} Japan`,
    };
  });
}

function japanActivityToTripActivity(activity: Activity): TripActivity {
  return {
    id: activity.id,
    tripId: "japan-2026",
    day: activity.day,
    city: activity.city,
    country: "Japan",
    title: activity.title,
    type: "activity",
    description: activity.description,
    category: activity.category,
    address: "",
    googleMapsQuery: activity.googleMapsQuery,
    duration: activity.visitDuration,
    travelTimeFromPrevious: activity.travelTimeFromBase,
    transportMode: "local transit",
    estimatedCost: activity.estimatedCostMid,
    estimatedCostLow: activity.estimatedCostLow,
    estimatedCostMid: activity.estimatedCostMid,
    estimatedCostHigh: activity.estimatedCostHigh,
    currency: "JPY",
    costLocal: activity.estimatedCostMid,
    localCurrencyCode: "JPY",
    costCad: Math.round(activity.estimatedCostMid / DEFAULT_CAD_TO_JPY),
    costCategory: "activity",
    costStatus: "imported",
    bookingStatus: activity.isBooked ? "booked" : activity.bookingRequired === "yes" ? "needs-confirmation" : "optional",
    attachmentIds: [],
    notes: activity.notes,
    imageUrl: activity.imageUrl || placeholderFor(activity.title),
    imageAlt: activity.imageAlt,
    imageCredit: activity.imageCredit,
    imageCreditUrl: activity.imageCreditUrl,
    imageLicense: activity.imageLicense,
    imageSearchQuery: activity.imageSearchQuery,
    priority: activity.priority,
    isBooked: activity.isBooked,
    isCompleted: activity.isCompleted,
    source: "japan-default",
    branch: activity.branch,
  };
}

function japanStayToHotel(stay: StayArea): TripHotel {
  const nights = Math.max(1, stay.nights);
  return {
    id: `japan-hotel-${stay.id}`,
    tripId: "japan-2026",
    name: stay.area,
    city: stay.city,
    country: "Japan",
    checkIn: stay.days,
    checkOut: stay.days,
    estimatedCost: stay.estimatedMidPerNight * nights,
    currency: "JPY",
    costLocal: stay.estimatedMidPerNight * nights,
    localCurrencyCode: "JPY",
    costCad: Math.round((stay.estimatedMidPerNight * nights) / DEFAULT_CAD_TO_JPY),
    costStatus: "imported",
    source: "japan-default",
    notes: `${nights} nights. ${stay.note}`,
  };
}

function buildJapanTrip(activities = defaultActivities, stayAreas = defaultStayAreas): Trip {
  return {
    id: "japan-2026",
    title: "Japan Trip",
    country: "Japan",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    currency: "JPY",
    currencyConfig: {
      localCurrency: "JPY",
      comparisonCurrency: "CAD",
      localPerCad: DEFAULT_CAD_TO_JPY,
      label: "JPY per 1 CAD",
      isEstimate: true,
    },
    description: "A month in Japan built around Tokyo, Fuji, Kyoto, Osaka, Hiroshima, the Alps, and one northern or southern extension.",
    activities: hydrateJapanActivities(activities).map(japanActivityToTripActivity),
    flights: [
      {
        id: "japan-flight-inbound-placeholder",
        tripId: "japan-2026",
        airline: "Add airline",
        flightNumber: "Add flight",
        departureAirport: "Add departure airport",
        arrivalAirport: "Tokyo",
        departureTime: "2026-09-01T00:00:00",
        arrivalTime: "2026-09-01T00:00:00",
        status: "pending",
        notes: "Manual placeholder. Add real flight details when booked.",
      },
    ],
    hotels: stayAreas.map(japanStayToHotel),
    attachments: [
      {
        id: "japan-rail-bookings-placeholder",
        tripId: "japan-2026",
        fileName: "rail-and-hotel-bookings-placeholder.pdf",
        type: "booking",
        note: "Local-only metadata placeholder for rail passes, hotels, and tickets.",
        isSensitivePlaceholder: true,
      },
    ],
    notes: "Japan edits from the original planner are preserved when migrating to Itinerary Mate.",
  };
}

function mergeTrip(defaultTrip: Trip, storedTrip?: Trip): Trip {
  if (!storedTrip) return defaultTrip;
  const storedById = new Map(storedTrip.activities.map((activity) => [activity.id, activity]));
  const storedBySource = new Map(storedTrip.activities.filter((activity) => activity.sourceId).map((activity) => [activity.sourceId, activity]));
  const storedByTitleDate = new Map(storedTrip.activities.map((activity) => [`${activity.title.toLowerCase()}|${activity.date || ""}`, activity]));
  const defaultIds = new Set(defaultTrip.activities.map((activity) => activity.id));
  const mergeNotes = (baseNotes: string, storedNotes?: string) => {
    if (!storedNotes) return baseNotes;
    if (!baseNotes) return storedNotes;
    if (storedNotes.includes(baseNotes)) return storedNotes;
    if (baseNotes.includes(storedNotes)) return baseNotes;
    return `${baseNotes}\n${storedNotes}`;
  };
  const editableMerge = (base: TripActivity, stored?: TripActivity): TripActivity => {
    if (!stored) return base;
    const sameCurrency = stored.currency === base.currency;
    const storedImageLooksAuto = stored.tripId === "peru-2026" && stored.imageCredit === "Wikimedia Commons";
    const shouldUseBaseImage = storedImageLooksAuto || (isImageUrl(base.imageUrl) && !isImageUrl(stored.imageUrl));
    return {
      ...base,
      notes: mergeNotes(base.notes, stored.notes),
      isBooked: stored.isBooked ?? base.isBooked,
      isCompleted: stored.isCompleted ?? base.isCompleted,
      bookingReference: stored.bookingReference || base.bookingReference,
      confirmationReference: stored.confirmationReference || base.confirmationReference,
      bookingStatus: stored.bookingStatus || base.bookingStatus,
      day: stored.day || base.day,
      category: stored.category || base.category,
      estimatedCost: sameCurrency ? stored.estimatedCost : base.estimatedCost,
      costLocal: sameCurrency ? stored.costLocal ?? stored.estimatedCost : base.costLocal,
      costCad: sameCurrency ? stored.costCad ?? base.costCad : base.costCad,
      costStatus: sameCurrency ? stored.costStatus || base.costStatus : base.costStatus,
      imageUrl: shouldUseBaseImage ? base.imageUrl || placeholderFor(base.title) : stored.imageUrl || base.imageUrl || placeholderFor(base.title),
      imageAlt: shouldUseBaseImage ? base.imageAlt : stored.imageAlt || base.imageAlt,
      imageCredit: shouldUseBaseImage ? base.imageCredit : stored.imageCredit || base.imageCredit,
      imageCreditUrl: shouldUseBaseImage ? base.imageCreditUrl : stored.imageCreditUrl || base.imageCreditUrl,
      imageLicense: shouldUseBaseImage ? base.imageLicense : stored.imageLicense || base.imageLicense,
      imageSearchQuery: shouldUseBaseImage ? base.imageSearchQuery : stored.imageSearchQuery || base.imageSearchQuery,
      attachmentIds: stored.attachmentIds?.length ? stored.attachmentIds : base.attachmentIds ?? [],
    };
  };
  const activities = defaultTrip.activities.map((activity) =>
    editableMerge(
      activity,
      storedById.get(activity.id) ||
        (activity.sourceId ? storedBySource.get(activity.sourceId) : undefined) ||
        storedByTitleDate.get(`${activity.title.toLowerCase()}|${activity.date || ""}`),
    ),
  );
  const manualActivities = storedTrip.activities.filter((activity) => !defaultIds.has(activity.id) && (activity.source === "manual" || activity.id.includes("custom") || activity.id.includes("rest")));
  return {
    ...defaultTrip,
    notes: storedTrip.notes || defaultTrip.notes,
    currencyConfig: storedTrip.currencyConfig || defaultTrip.currencyConfig,
    activities: [...activities, ...manualActivities],
    flights: storedTrip.flights?.length ? storedTrip.flights : defaultTrip.flights,
    hotels: storedTrip.hotels?.length ? storedTrip.hotels : defaultTrip.hotels,
    attachments: storedTrip.attachments?.length ? storedTrip.attachments : defaultTrip.attachments,
  };
}

function defaultState(): MultiTripState {
  const legacy = parseStored<LegacyJapanState>(LEGACY_JAPAN_STORAGE_KEY);
  const japanBranch = legacy?.branch || "hokkaido";
  return {
    version: 2,
    activeTripId: "japan-2026",
    trips: {
      "japan-2026": buildJapanTrip(legacy?.activities || defaultActivities, legacy?.stayAreas || defaultStayAreas),
      "peru-2026": peruTrip,
      "portugal-2026": portugalTrip,
    },
    japanBranch,
    japanCadToJpy: legacy?.cadToJpy || DEFAULT_CAD_TO_JPY,
    themePreference: "light",
    updatedAt: new Date().toISOString(),
  };
}

function loadState(): MultiTripState {
  const defaults = defaultState();
  const stored = parseStored<MultiTripState>(MULTI_STORAGE_KEY);
  if (!stored || stored.version !== 2 || !stored.trips) return defaults;
  return {
    ...defaults,
    ...stored,
    activeTripId: stored.activeTripId || "japan-2026",
    japanBranch: stored.japanBranch || "hokkaido",
    japanCadToJpy: stored.japanCadToJpy || DEFAULT_CAD_TO_JPY,
    themePreference: normalizeThemePreference(stored.themePreference),
    trips: {
      "japan-2026": mergeTrip(defaults.trips["japan-2026"], stored.trips["japan-2026"]),
      "peru-2026": mergeTrip(peruTrip, stored.trips["peru-2026"]),
      "portugal-2026": mergeTrip(portugalTrip, stored.trips["portugal-2026"]),
    },
  };
}

function formatDate(date?: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function dateForTripDay(startDate: string | undefined, day: number) {
  if (!startDate) return undefined;
  const date = new Date(`${startDate}T12:00:00`);
  date.setDate(date.getDate() + Math.max(0, day - 1));
  return date.toISOString().slice(0, 10);
}

function formatMoney(value: number, currency: string, localPerCad = DEFAULT_CAD_TO_JPY) {
  if (currency === "JPY") {
    const jpy = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(Math.round(value));
    const cad = `CAD ${new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(Math.round(value / localPerCad))}`;
    return `JPY ${jpy} (${cad})`;
  }
  if (currency === "PEN") {
    const pen = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 }).format(Math.round(value));
    const cad = `CAD ${new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(Math.round(value / localPerCad))}`;
    return `PEN ${pen} (${cad})`;
  }
  if (currency === "EUR") {
    const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(value));
    const cad = `CAD ${new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(Math.round(value / localPerCad))}`;
    return `EUR ${eur} (${cad})`;
  }
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function formatCadOnly(value: number, localPerCad: number) {
  return `${new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(Math.round(value / localPerCad))} CAD`;
}

function formatLocalOnly(value: number, currency: string) {
  const locale = currency === "PEN" ? "es-PE" : currency === "EUR" ? "de-DE" : "ja-JP";
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: currency === "EUR" ? 2 : 0 }).format(currency === "EUR" ? value : Math.round(value));
}

function formatLocalApprox(value: number, currency: string) {
  if (!value) return "";
  const prefix = currency === "JPY" ? "approx. " : currency === "PEN" ? "approx. " : "";
  return `${prefix}${formatLocalOnly(value, currency)}`;
}

function getExchangeRate(trip: Trip, japanCadToJpy: number) {
  return trip.currencyConfig?.localPerCad || (trip.currency === "JPY" ? japanCadToJpy : 1);
}

function getCurrencyLabel(trip: Trip) {
  return trip.currencyConfig?.label || `${trip.currency} per 1 CAD`;
}

function getCostLabel(activity: TripActivity, exchangeRate: number) {
  const cost = activity.costLocal ?? activity.estimatedCost;
  if (!cost) return "Add cost";
  const currency = activity.localCurrencyCode || activity.currency;
  return `${formatCadOnly(cost, exchangeRate)}${activity.costCategory ? ` | ${activity.costCategory}` : ""}`;
}

function getLocalCostSubtext(value: number, currency: string) {
  if (!value || currency === "CAD") return "";
  return formatLocalApprox(value, currency);
}

function activityStatusLabel(activity: TripActivity) {
  if (activity.isCompleted) return "Done";
  if (activity.isBooked || activity.bookingStatus === "booked") return "Booked";
  if (activity.bookingStatus === "optional") return "Optional";
  return "Not booked";
}

function routeTimeLabel(activity: TripActivity) {
  return activity.routeLegEstimate || activity.travelTimeFromPrevious || "";
}

function tripDayRouteSummary(trip: Trip, day: number) {
  if (trip.id === "peru-2026") return peruDayRouteSummaries[day] || "";
  if (trip.id === "portugal-2026") return portugalDayRouteSummaries[day] || "";
  return "";
}

function cleanUiText(text = "") {
  return text
    .replace(/Wanderlog PDF:\\s*/gi, "")
    .replace(/Cost needs confirmation/gi, "Cost not set")
    .replace(/Timing needs confirmation/gi, "Timing not set")
    .trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function longitudeToTileX(longitude: number, zoom: number) {
  return ((longitude + 180) / 360) * 2 ** zoom;
}

function latitudeToTileY(latitude: number, zoom: number) {
  const latRad = (clamp(latitude, -85.0511, 85.0511) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * 2 ** zoom;
}

function getMapZoom(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  const latSpan = bounds.maxLat - bounds.minLat;
  const lngSpan = bounds.maxLng - bounds.minLng;
  const span = Math.max(latSpan, lngSpan);
  if (span > 70) return 3;
  if (span > 35) return 4;
  if (span > 15) return 5;
  if (span > 7) return 7;
  if (span > 2.5) return 9;
  return 12;
}

function activityRange(activity: TripActivity): BudgetRange {
  const cost = activity.costLocal ?? activity.estimatedCost;
  return {
    low: activity.estimatedCostLow ?? cost,
    mid: activity.estimatedCostMid ?? cost,
    high: activity.estimatedCostHigh ?? cost,
  };
}

function sumRanges(ranges: BudgetRange[]): BudgetRange {
  return ranges.reduce(
    (total, range) => ({ low: total.low + range.low, mid: total.mid + range.mid, high: total.high + range.high }),
    { low: 0, mid: 0, high: 0 },
  );
}

function csvEscape(value: string | number | boolean | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportRows(activities: TripActivity[]) {
  return activities
    .slice()
    .sort((a, b) => a.day - b.day || activities.indexOf(a) - activities.indexOf(b))
    .map((activity) => ({
      place: activity.title,
      address: activity.address || activity.googleMapsQuery,
      city: activity.city,
      category: activity.category,
      day: activity.day,
      date: activity.date || "",
      notes: [activity.description, activity.notes].filter(Boolean).join(" "),
      estimatedCost: activity.costLocal ?? activity.estimatedCost,
      currency: activity.localCurrencyCode || activity.currency,
      cadCost: activity.costCad ?? 0,
      costStatus: activity.costStatus || "",
      source: activity.source || "",
      travelTime: activity.travelTimeFromPrevious || "",
      query: activity.googleMapsQuery,
    }));
}

function rowsToCsv(rows: ReturnType<typeof exportRows>) {
  const header = ["Place name", "Address or search query", "City", "Category", "Day", "Date", "Notes", "Estimated local cost", "Local currency", "CAD estimate", "Cost status", "Travel time", "Source"];
  const body = rows.map((row) => [row.place, row.address || row.query, row.city, row.category, row.day, row.date, row.notes, row.estimatedCost, row.currency, row.cadCost, row.costStatus, row.travelTime, row.source]);
  return [header, ...body].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function copyText(text: string) {
  return navigator.clipboard.writeText(text);
}

function googleMapUrl(activity: Pick<TripActivity, "googleMapsQuery" | "address" | "title" | "city" | "country">) {
  const query = activity.googleMapsQuery || activity.address || [activity.title, activity.city, activity.country].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function dayScore(items: TripActivity[]) {
  const fullDayCount = items.filter((item) => /full day|half day/i.test(item.duration)).length;
  const travelHits = items.filter((item) => /hr|hour|flight|train|airport|transfer/i.test(`${item.travelTimeFromPrevious} ${item.transportMode} ${item.duration}`)).length;
  const score = items.length + fullDayCount * 2 + travelHits * 0.6;
  if (score >= 7 || items.length >= 5) return { label: "Too packed", tone: "danger" };
  if (score >= 5 || fullDayCount > 0) return { label: "Full day", tone: "warn" };
  if (items.length <= 1) return { label: "Light day", tone: "calm" };
  return { label: "Balanced", tone: "good" };
}

function visibleActivities(trip: Trip, branch: TripBranch) {
  if (trip.id !== "japan-2026") return trip.activities;
  return trip.activities.filter((activity) => !activity.branch || activity.branch === branch);
}

function App() {
  const initial = useMemo(loadState, []);
  const [state, setState] = useState<MultiTripState>(initial);
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [selectedCategory, setSelectedCategory] = useState<TripCategory | "All">("All");
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedDay, setSelectedDay] = useState<number | "All">("All");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState("Saved locally");
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(() => new Set());
  const [loadedImageIds, setLoadedImageIds] = useState<Set<string>>(() => new Set());
  const [updateReady, setUpdateReady] = useState(false);
  const [checklists, setChecklists] = useState<Record<TripId, ChecklistItem[]>>(() => parseStored<Record<TripId, ChecklistItem[]>>(CHECKLIST_STORAGE_KEY) || makeDefaultChecklistState());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const activeTrip = state.trips[state.activeTripId];
  const activeNavItems = useMemo(
    () =>
      calendarTripIds.has(activeTrip.id)
        ? baseNavItems.flatMap((item) => (item.id === "itinerary" ? [item, { id: "calendar" as AppView, label: "Calendar" }] : [item]))
        : baseNavItems,
    [activeTrip.id],
  );
  const allVisibleActivities = useMemo(() => visibleActivities(activeTrip, state.japanBranch), [activeTrip, state.japanBranch]);
  const totalDays = useMemo(() => Math.max(...activeTrip.activities.map((activity) => activity.day), 1), [activeTrip.activities]);
  const days = useMemo(() => Array.from({ length: totalDays }, (_, index) => index + 1), [totalDays]);

  const cities = useMemo(() => ["All", ...Array.from(new Set(allVisibleActivities.map((activity) => activity.city))).sort()], [allVisibleActivities]);
  const dayOptions = useMemo(() => ["All" as const, ...days], [days]);

  const filteredActivities = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allVisibleActivities.filter((activity) => {
      const categoryMatch = selectedCategory === "All" || activity.category === selectedCategory;
      const cityMatch = selectedCity === "All" || activity.city === selectedCity;
      const dayMatch = selectedDay === "All" || activity.day === selectedDay;
      const queryMatch =
        !q ||
        [activity.title, activity.city, activity.country, activity.description, activity.notes, activity.address]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return categoryMatch && cityMatch && dayMatch && queryMatch;
    });
  }, [allVisibleActivities, query, selectedCategory, selectedCity, selectedDay]);

  const placeBrowserActivities = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allVisibleActivities.filter((activity) => {
      const categoryMatch = selectedCategory === "All" || activity.category === selectedCategory;
      const cityMatch = selectedCity === "All" || activity.city === selectedCity;
      const queryMatch =
        !q ||
        [activity.title, activity.city, activity.country, activity.description, activity.notes, activity.address]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return categoryMatch && cityMatch && queryMatch;
    });
  }, [allVisibleActivities, query, selectedCategory, selectedCity]);

  const timelineDays = useMemo(() => (activeView === "itinerary" ? days : selectedDay === "All" ? days : days.includes(selectedDay) ? [selectedDay] : [days[0] || 1]), [activeView, days, selectedDay]);
  const selectedDayActivities = useMemo(
    () => (selectedDay === "All" ? filteredActivities : filteredActivities.filter((activity) => activity.day === selectedDay)),
    [filteredActivities, selectedDay],
  );

  const budget = useMemo(() => makeBudget(activeTrip, allVisibleActivities), [activeTrip, allVisibleActivities]);
  const routeSuggestions = useMemo(() => makeRouteSuggestions(activeTrip, allVisibleActivities), [activeTrip, allVisibleActivities]);
  const resolvedTheme = state.themePreference;
  const activeExchangeRate = getExchangeRate(activeTrip, state.japanCadToJpy);

  useEffect(() => {
    const onUpdateReady = () => setUpdateReady(true);
    window.addEventListener("itinerary-mate-update-ready", onUpdateReady);
    return () => window.removeEventListener("itinerary-mate-update-ready", onUpdateReady);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    setSelectedDay("All");
    setSelectedCategory("All");
    setSelectedCity("All");
    setQuery("");
    setExpandedId(null);
    setActiveView("dashboard");
  }, [state.activeTripId]);

  useEffect(() => {
    localStorage.setItem(
      MULTI_STORAGE_KEY,
      JSON.stringify({
        ...state,
        updatedAt: new Date().toISOString(),
      }),
    );
    setSaveStatus(`Saved locally ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  }, [state]);

  useEffect(() => {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checklists));
  }, [checklists]);

  function updateState(patch: Partial<MultiTripState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  function updateActiveTrip(patch: Partial<Trip>) {
    setState((current) => ({
      ...current,
      trips: {
        ...current.trips,
        [current.activeTripId]: {
          ...current.trips[current.activeTripId],
          ...patch,
        },
      },
    }));
  }

  function openView(view: AppView) {
    setActiveView(view);
    if (view === "itinerary") setSelectedDay("All");
  }

  function jumpToItineraryDay(day: number) {
    if (activeView === "itinerary") {
      setSelectedDay("All");
      window.requestAnimationFrame(() => {
        document.getElementById(`itinerary-day-${day}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    setSelectedDay(day);
  }

  function setActiveExchangeRate(localPerCad: number) {
    if (activeTrip.id === "japan-2026") {
      updateState({ japanCadToJpy: localPerCad });
    }
    updateActiveTrip({
      currencyConfig: {
        localCurrency: activeTrip.currency,
        comparisonCurrency: "CAD",
        localPerCad,
        label: `${activeTrip.currency} per 1 CAD`,
        isEstimate: true,
      },
    });
  }

  function replaceActiveTrip(nextTrip: Trip) {
    setState((current) => ({
      ...current,
      trips: {
        ...current.trips,
        [current.activeTripId]: nextTrip,
      },
    }));
  }

  function updateActiveChecklist(nextItems: ChecklistItem[]) {
    setChecklists((current) => ({ ...current, [activeTrip.id]: nextItems }));
    setSaveStatus(`Saved checklist ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  }

  function addChecklistItem(text: string) {
    const cleanText = text.trim();
    if (!cleanText) return;
    updateActiveChecklist([
      {
        id: `${activeTrip.id}-task-${Date.now()}`,
        tripId: activeTrip.id,
        text: cleanText,
        isDone: false,
      },
      ...(checklists[activeTrip.id] || []),
    ]);
  }

  function toggleChecklistItem(id: string, isDone: boolean) {
    updateActiveChecklist((checklists[activeTrip.id] || []).map((item) => item.id === id ? { ...item, isDone, archivedAt: isDone ? new Date().toISOString() : undefined } : item));
  }

  function deleteChecklistItem(id: string) {
    updateActiveChecklist((checklists[activeTrip.id] || []).filter((item) => item.id !== id));
  }

  function updateActivity(id: string, patch: Partial<TripActivity>) {
    updateActiveTrip({
      activities: activeTrip.activities.map((activity) => {
        if (activity.id !== id) return activity;
        const nextPatch: Partial<TripActivity> = { ...patch };
        if (patch.estimatedCost !== undefined || patch.costLocal !== undefined) {
          const nextCost = Number(patch.costLocal ?? patch.estimatedCost ?? 0);
          nextPatch.estimatedCost = nextCost;
          nextPatch.costLocal = nextCost;
          nextPatch.localCurrencyCode = activity.localCurrencyCode || activeTrip.currency;
          nextPatch.costCad = Number((nextCost / activeExchangeRate).toFixed(2));
          nextPatch.costStatus = "manual";
          if (activity.estimatedCostLow !== undefined) nextPatch.estimatedCostLow = nextCost;
          if (activity.estimatedCostMid !== undefined) nextPatch.estimatedCostMid = nextCost;
          if (activity.estimatedCostHigh !== undefined) nextPatch.estimatedCostHigh = nextCost;
        }
        if (patch.isBooked !== undefined) {
          nextPatch.bookingStatus = patch.isBooked ? "booked" : "not-booked";
        }
        return { ...activity, ...nextPatch };
      }),
    });
  }

  function updateHotel(id: string, patch: Partial<TripHotel>) {
    updateActiveTrip({
      hotels: activeTrip.hotels.map((hotel) => {
        if (hotel.id !== id) return hotel;
        const nextPatch: Partial<TripHotel> = { ...patch };
        if (patch.estimatedCost !== undefined || patch.costLocal !== undefined) {
          const nextCost = Number(patch.costLocal ?? patch.estimatedCost ?? 0);
          nextPatch.estimatedCost = nextCost;
          nextPatch.costLocal = nextCost;
          nextPatch.localCurrencyCode = hotel.localCurrencyCode || activeTrip.currency;
          nextPatch.costCad = Number((nextCost / activeExchangeRate).toFixed(2));
          nextPatch.costStatus = "manual";
        }
        return { ...hotel, ...nextPatch };
      }),
    });
  }

  function addActivity() {
    const id = `${activeTrip.id}-custom-${Date.now()}`;
    const newActivity: TripActivity = {
      id,
      tripId: activeTrip.id,
      day: selectedDay === "All" ? 1 : selectedDay,
      date: activeTrip.startDate,
      city: selectedCity === "All" ? activeTrip.country : selectedCity,
      country: activeTrip.country,
      title: "New custom activity",
      type: "activity",
      description: "Add why this belongs on the trip.",
      category: "Nice To Have",
      address: "",
      googleMapsQuery: `New custom activity ${activeTrip.country}`,
      duration: "1-2 hr",
      travelTimeFromPrevious: "Add estimate",
      transportMode: "",
      estimatedCost: 0,
      estimatedCostLow: activeTrip.currency === "JPY" ? 0 : undefined,
      estimatedCostMid: activeTrip.currency === "JPY" ? 0 : undefined,
      estimatedCostHigh: activeTrip.currency === "JPY" ? 0 : undefined,
      currency: activeTrip.currency,
      costLocal: 0,
      localCurrencyCode: activeTrip.currency,
      costCad: 0,
      costCategory: "activity",
      costStatus: "manual",
      bookingStatus: "not-booked",
      attachmentIds: [],
      notes: "",
      imageUrl: placeholderFor("Custom activity"),
      imageAlt: "Image-style placeholder for a custom activity.",
      priority: 3,
      isBooked: false,
      isCompleted: false,
      source: "manual",
    };
    updateActiveTrip({ activities: [newActivity, ...activeTrip.activities] });
    setExpandedId(id);
    setSelectedDay(newActivity.day);
    setActiveView("itinerary");
  }

  function addJapanExplorePlace(place: JapanExplorePlace, day: number) {
    const id = `japan-2026-idea-${place.id}-${Date.now()}`;
    const isFood = place.kind === "Food" || place.kind === "Restaurants";
    const newActivity: TripActivity = {
      id,
      tripId: "japan-2026",
      day,
      date: dateForTripDay(activeTrip.startDate, day),
      city: place.city === "Hokkaido" || place.city === "Kyushu" ? place.neighborhood : place.city,
      region: place.region,
      country: "Japan",
      title: place.title,
      type: isFood ? "food" : "activity",
      description: place.description,
      category: isFood ? "Food" : place.kind === "Day Trips" || place.kind === "Branch Ideas" ? "Nice To Have" : "Extra",
      address: "",
      googleMapsQuery: place.googleMapsQuery,
      duration: place.recommendedTime ? `${place.recommendedTime} idea` : "Add timing",
      travelTimeFromPrevious: "Add estimate",
      transportMode: "",
      estimatedCost: place.estimatedCostJpy,
      estimatedCostLow: place.estimatedCostJpy,
      estimatedCostMid: place.estimatedCostJpy,
      estimatedCostHigh: place.estimatedCostJpy,
      currency: "JPY",
      costLocal: place.estimatedCostJpy,
      localCurrencyCode: "JPY",
      costCad: Number((place.estimatedCostJpy / activeExchangeRate).toFixed(2)),
      costCategory: isFood ? "food" : "activity",
      costStatus: "manual",
      bookingStatus: "not-booked",
      attachmentIds: [],
      notes: `Added from Japan Explore research board. Why go: ${place.whyGo}`,
      imageUrl: place.imageUrl || placeholderFor(place.title),
      imageAlt: place.imageAlt,
      imageCredit: place.imageCredit,
      imageCreditUrl: place.imageCreditUrl,
      imageLicense: place.imageLicense,
      imageSearchQuery: place.imageSearchQuery,
      priority: 3,
      isBooked: false,
      isCompleted: false,
      source: "manual",
    };
    updateActiveTrip({ activities: [newActivity, ...activeTrip.activities] });
    setExpandedId(id);
    setSelectedDay(day);
    setActiveView("itinerary");
    setSaveStatus(`Added ${place.title} to Day ${day}`);
  }

  function addOpenMapPlace(place: OpenPlaceSearchResult, day: number) {
    const targetDay = Number.isFinite(day) && day > 0 ? day : 1;
    const id = `${activeTrip.id}-map-${Date.now()}`;
    const category: TripCategory =
      place.osmClass === "amenity" && ["restaurant", "cafe", "bar", "pub", "fast_food"].includes(place.osmType || "")
        ? "Food"
        : place.osmType === "hotel" || place.osmType === "hostel" || place.osmType === "guest_house"
          ? "Hotel"
          : "Nice To Have";
    const newActivity: TripActivity = {
      id,
      tripId: activeTrip.id,
      day: targetDay,
      date: dateForTripDay(activeTrip.startDate, targetDay),
      city: place.city || (selectedCity !== "All" ? selectedCity : activeTrip.country),
      country: activeTrip.country,
      title: place.name,
      type: category === "Food" ? "food" : category === "Hotel" ? "hotel" : "activity",
      description: "Added from open map search. Add notes once you decide if it belongs.",
      category,
      address: place.address,
      googleMapsQuery: place.address || `${place.name} ${activeTrip.country}`,
      latitude: place.latitude,
      longitude: place.longitude,
      duration: "Add timing",
      travelTimeFromPrevious: "Add estimate",
      estimatedCost: 0,
      estimatedCostLow: activeTrip.currency === "JPY" ? 0 : undefined,
      estimatedCostMid: activeTrip.currency === "JPY" ? 0 : undefined,
      estimatedCostHigh: activeTrip.currency === "JPY" ? 0 : undefined,
      currency: activeTrip.currency,
      costLocal: 0,
      localCurrencyCode: activeTrip.currency,
      costCad: 0,
      costCategory: category === "Food" ? "food" : category === "Hotel" ? "hotel" : "activity",
      costStatus: "manual",
      bookingStatus: "not-booked",
      attachmentIds: [],
      notes: `Source: OpenStreetMap/Photon search. OSM type: ${[place.osmClass, place.osmType].filter(Boolean).join(" / ") || "unknown"}.`,
      imageUrl: placeholderFor(place.name),
      imageAlt: `Map search placeholder for ${place.name}.`,
      priority: 3,
      isBooked: false,
      isCompleted: false,
      source: "manual",
    };
    updateActiveTrip({ activities: [newActivity, ...activeTrip.activities] });
    setExpandedId(id);
    setSelectedDay(targetDay);
    setActiveView("itinerary");
    setSaveStatus(`Added ${place.name} to Day ${targetDay}`);
  }

  function deleteActivity(id: string) {
    const item = activeTrip.activities.find((activity) => activity.id === id);
    if (!item || !window.confirm(`Delete "${item.title}" from ${activeTrip.title}?`)) return;
    updateActiveTrip({ activities: activeTrip.activities.filter((activity) => activity.id !== id) });
    if (expandedId === id) setExpandedId(null);
  }

  function addRestDay() {
    const targetDay = selectedDay === "All" ? days[days.length - 1] || 1 : selectedDay;
    const id = `${activeTrip.id}-rest-${Date.now()}`;
    updateActiveTrip({
      activities: [
        {
          id,
          tripId: activeTrip.id,
          day: targetDay,
          date: activeTrip.startDate,
          city: selectedCity === "All" ? activeTrip.country : selectedCity,
          country: activeTrip.country,
          title: "Rest day block",
          type: "note",
          description: "Keep this space protected. Laundry, sleep, slow food, and no big transfers.",
          category: "Note",
          googleMapsQuery: `${activeTrip.country} rest day`,
          duration: "Flexible",
          estimatedCost: 0,
          currency: activeTrip.currency,
          costLocal: 0,
          localCurrencyCode: activeTrip.currency,
          costCad: 0,
          costCategory: "misc",
          costStatus: "manual",
          bookingStatus: "not-booked",
          attachmentIds: [],
          notes: "",
          imageUrl: placeholderFor("Rest day"),
          imageAlt: "Calm placeholder for a rest day.",
          priority: 4,
          isBooked: false,
          isCompleted: false,
          source: "manual",
        },
        ...activeTrip.activities,
      ],
    });
  }

  function resetActiveTrip() {
    if (!window.confirm(`Reset ${activeTrip.title} back to default data?`)) return;
    const nextTrip = activeTrip.id === "japan-2026" ? buildJapanTrip() : activeTrip.id === "peru-2026" ? peruTrip : portugalTrip;
    setState((current) => ({
      ...current,
      trips: { ...current.trips, [activeTrip.id]: nextTrip },
      japanBranch: activeTrip.id === "japan-2026" ? "hokkaido" : current.japanBranch,
    }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : "";
    if (!overId.startsWith("day-")) return;
    const day = Number(overId.replace("day-", ""));
    if (!Number.isFinite(day)) return;
    updateActivity(id, { day });
  }

  function downloadCsv(rows = exportRows(filteredActivities)) {
    const blob = new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeTrip.id}-google-maps-export.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const isJapanExploreView = activeTrip.id === "japan-2026" && activeView === "places";
  const isTripCalendarView = calendarTripIds.has(activeTrip.id) && activeView === "calendar";
  const isDiscoveryView = activeView === "discovery";

  return (
    <div className={`app-shell trip-${activeTrip.id === "peru-2026" ? "peru" : activeTrip.id === "portugal-2026" ? "portugal" : "japan"}`}>
      <header className="topbar">
        <a className="skip-link" href="#main-content">Skip to itinerary</a>
        <div className="brand-block">
          <p className="eyebrow">Local-first travel command center</p>
          <h1>Itinerary Mate</h1>
          {!bookedTripIds.has(activeTrip.id) && <p>{activeTrip.description}</p>}
        </div>
        <div className="topbar-actions">
          <TripSwitcher
            activeTripId={state.activeTripId}
            activeView={activeView}
            setActiveTripId={(activeTripId) => {
              updateState({ activeTripId });
              setSelectedDay("All");
              setActiveView("dashboard");
            }}
            openDiscovery={() => setActiveView("discovery")}
          />
          <ThemeToggle preference={state.themePreference} resolvedTheme={resolvedTheme} setPreference={(themePreference) => updateState({ themePreference })} />
          {updateReady && (
            <button className="update-button" type="button" onClick={() => window.location.reload()}>
              Update app
            </button>
          )}
          <span className="save-pill"><BadgeCheck size={16} aria-hidden="true" /> {saveStatus}</span>
          <button className="ghost-button" type="button" onClick={resetActiveTrip}>
            <RotateCcw size={17} aria-hidden="true" /> Reset trip
          </button>
        </div>
      </header>

      <nav className="nav-tabs" aria-label="Planner sections">
        {activeNavItems.map((item) => (
          <button key={item.id} type="button" className={activeView === item.id ? "active" : ""} onClick={() => openView(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>

      {activeView !== "dashboard" && !isJapanExploreView && !isTripCalendarView && !isDiscoveryView && (
        <DayRail
          days={days}
          activities={allVisibleActivities}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          onJumpToDay={jumpToItineraryDay}
          jumpMode={activeView === "itinerary"}
          trip={activeTrip}
          exchangeRate={activeExchangeRate}
        />
      )}

      <main id="main-content" className={`main-grid ${activeView === "itinerary" ? "itinerary-main-grid" : ""} ${(isJapanExploreView || isTripCalendarView || isDiscoveryView) ? "explore-main-grid" : ""}`}>
        {!isJapanExploreView && !isTripCalendarView && !isDiscoveryView && <aside className="side-panel">
          {activeTrip.id === "japan-2026" && (
            <section className="card route-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{formatDate(activeTrip.startDate)} to {formatDate(activeTrip.endDate)}</p>
                  <h2>{activeTrip.title}</h2>
                </div>
                <MapIcon size={20} aria-hidden="true" />
              </div>
              <div className="route-strip" aria-label="Trip route">
                {Array.from(new Set(allVisibleActivities.map((activity) => activity.city))).slice(0, 8).map((city) => (
                  <span key={city}>{city}</span>
                ))}
              </div>
              <BranchToggle branch={state.japanBranch} setBranch={(japanBranch) => updateState({ japanBranch })} cadToJpy={state.japanCadToJpy} />
            </section>
          )}

          <section className="card quick-card">
            <p className="eyebrow">Rough total</p>
            <strong>{formatCadOnly(budget.total.mid, activeExchangeRate)}</strong>
            <span>{formatLocalOnly(budget.total.mid, activeTrip.currency)}</span>
            {activeTrip.id === "japan-2026" && (
              <label className="field compact-field">
                <span>Planning rate</span>
                <input type="number" min="0.01" step="0.01" value={activeExchangeRate} onChange={(event) => setActiveExchangeRate(Math.max(0.01, Number(event.target.value)))} />
                <small>{getCurrencyLabel(activeTrip)}, rough planning only</small>
              </label>
            )}
          </section>

          {bookedTripIds.has(activeTrip.id) && <TripRegionCalendar trip={activeTrip} compact />}

          {activeTrip.id === "japan-2026" && <section className="card quick-card">
            <p className="eyebrow">Offline</p>
            <strong>Installable PWA</strong>
            <span>Core app and saved edits work offline. External images and live data may not.</span>
          </section>}
        </aside>}

        <div className="content-stack">
          {!(bookedTripIds.has(activeTrip.id) && activeView === "dashboard") && !(activeTrip.id === "japan-2026" && activeView === "places") && !isTripCalendarView && !isDiscoveryView && (
            <FilterBar
              query={query}
              setQuery={setQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedCity={selectedCity}
              setSelectedCity={setSelectedCity}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              cities={cities}
              days={dayOptions}
              addActivity={addActivity}
              addRestDay={addRestDay}
              tripId={activeTrip.id}
            />
          )}

          {activeView === "dashboard" && (
            <Dashboard
              trip={activeTrip}
              activities={allVisibleActivities}
              budget={budget}
              exchangeRate={activeExchangeRate}
              routeSuggestions={routeSuggestions}
              checklistItems={checklists[activeTrip.id] || []}
              addChecklistItem={addChecklistItem}
              toggleChecklistItem={toggleChecklistItem}
              deleteChecklistItem={deleteChecklistItem}
            />
          )}

          {activeView === "itinerary" && (
            <div className="planner-split">
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <ItineraryTimeline
                  days={timelineDays}
                  activities={filteredActivities}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  updateActivity={updateActivity}
                  deleteActivity={deleteActivity}
                  brokenImageIds={brokenImageIds}
                  setBrokenImageIds={setBrokenImageIds}
                  loadedImageIds={loadedImageIds}
                  setLoadedImageIds={setLoadedImageIds}
                  trip={activeTrip}
                  exchangeRate={activeExchangeRate}
                />
              </DndContext>
              {selectedDay === "All" ? (
                <TripDayMapStack trip={activeTrip} activities={filteredActivities} />
              ) : (
                <TripMapPanel
                  trip={activeTrip}
                  activities={selectedDayActivities.length ? selectedDayActivities : filteredActivities}
                  selectedDay={selectedDay}
                  onAddPlace={addOpenMapPlace}
                />
              )}
            </div>
          )}

          {activeView === "calendar" && calendarTripIds.has(activeTrip.id) && (
            <TripCalendar
              trip={activeTrip}
              activities={allVisibleActivities}
              exchangeRate={activeExchangeRate}
              openItineraryDay={(day) => {
                setSelectedDay("All");
                setActiveView("itinerary");
                window.requestAnimationFrame(() => {
                  document.getElementById(`itinerary-day-${day}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
              }}
            />
          )}

          {activeView === "places" && (
            activeTrip.id === "japan-2026" ? (
              <JapanExploreBoard
                places={japanExplorePlaces}
                days={days}
                addPlaceToItinerary={addJapanExplorePlace}
                brokenImageIds={brokenImageIds}
                setBrokenImageIds={setBrokenImageIds}
                loadedImageIds={loadedImageIds}
                setLoadedImageIds={setLoadedImageIds}
                exchangeRate={activeExchangeRate}
                setSaveStatus={setSaveStatus}
              />
            ) : (
              <PlaceBrowser
                activities={placeBrowserActivities}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                updateActivity={updateActivity}
                deleteActivity={deleteActivity}
                brokenImageIds={brokenImageIds}
                setBrokenImageIds={setBrokenImageIds}
                loadedImageIds={loadedImageIds}
                setLoadedImageIds={setLoadedImageIds}
                trip={activeTrip}
                exchangeRate={activeExchangeRate}
              />
            )
          )}

          {activeView === "discovery" && (
            <DiscoveryBoard
              places={discoveryPlaces}
              brokenImageIds={brokenImageIds}
              setBrokenImageIds={setBrokenImageIds}
              loadedImageIds={loadedImageIds}
              setLoadedImageIds={setLoadedImageIds}
              setSaveStatus={setSaveStatus}
            />
          )}

          {activeView === "budget" && (
            <BudgetDashboard trip={activeTrip} activities={allVisibleActivities} budget={budget} updateActivity={updateActivity} exchangeRate={activeExchangeRate} />
          )}

          {activeView === "maps" && (
            <MapsExport
              trip={activeTrip}
              activities={selectedDayActivities.length ? selectedDayActivities : filteredActivities}
              allActivities={allVisibleActivities}
              copyRows={async (rows) => {
                await copyText(rows.map((row) => `${row.place} | ${row.address || row.query} | Day ${row.day} | ${row.category} | ${row.estimatedCost} ${row.currency} | CAD ${row.cadCost || "estimate"} | ${row.notes}`).join("\n"));
                setSaveStatus("Copied open map rows");
              }}
              downloadCsv={downloadCsv}
              exchangeRate={activeExchangeRate}
              onAddPlace={addOpenMapPlace}
            />
          )}

          {activeView === "more" && (
            <MorePanel
              trip={activeTrip}
              activities={allVisibleActivities}
              routeSuggestions={routeSuggestions}
              replaceActiveTrip={replaceActiveTrip}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function makeBudget(trip: Trip, activities: TripActivity[]) {
  const attractions = sumRanges(activities.filter((activity) => !["Flight", "Hotel", "Transit"].includes(activity.category)).map(activityRange));
  const transport = sumRanges(activities.filter((activity) => ["Flight", "Transit"].includes(activity.category)).map(activityRange));
  const lodging = sumRanges(trip.hotels.map((hotel) => ({ low: hotel.estimatedCost, mid: hotel.estimatedCost, high: hotel.estimatedCost })));
  const food = sumRanges(activities.filter((activity) => activity.category === "Food").map(activityRange));
  const misc = sumRanges(activities.filter((activity) => ["Extra", "Note", "Attachment"].includes(activity.category)).map(activityRange));
  const total = sumRanges([attractions, transport, lodging, food, misc]);
  const byCity = activities.reduce<Record<string, BudgetRange>>((acc, activity) => {
    acc[activity.city] ||= { low: 0, mid: 0, high: 0 };
    const range = activityRange(activity);
    acc[activity.city].low += range.low;
    acc[activity.city].mid += range.mid;
    acc[activity.city].high += range.high;
    return acc;
  }, {});
  return { total, categories: { lodging, food, transport, attractions, "shopping/miscellaneous": misc }, byCity };
}

function makeRouteSuggestions(trip: Trip, activities: TripActivity[]): RouteSuggestion[] {
  const suggestions: RouteSuggestion[] = trip.id === "peru-2026" ? [...peruRouteSuggestions] : trip.id === "portugal-2026" ? [...portugalRouteSuggestions] : [];
  const grouped = activities.reduce<Record<number, TripActivity[]>>((acc, activity) => {
    acc[activity.day] ||= [];
    acc[activity.day].push(activity);
    return acc;
  }, {});
  Object.entries(grouped).forEach(([dayKey, items]) => {
    const day = Number(dayKey);
    const pacing = dayScore(items);
    if (pacing.tone === "danger") {
      suggestions.push({
        id: `${trip.id}-packed-${day}`,
        tripId: trip.id,
        day,
        severity: "warning",
        title: `Day ${day} is crowded`,
        detail: "Move one lower-priority stop or protect a longer break between transfers.",
      });
    }
    const cities = Array.from(new Set(items.map((item) => item.city)));
    if (cities.length >= 3) {
      suggestions.push({
        id: `${trip.id}-city-hop-${day}`,
        tripId: trip.id,
        day,
        severity: "warning",
        title: `Day ${day} crosses several bases`,
        detail: `This day touches ${cities.join(", ")}. Group nearby stops or make one city the anchor.`,
      });
    }
  });
  if (trip.id === "japan-2026") {
    suggestions.push({
      id: "japan-routing-future-api",
      tripId: trip.id,
      severity: "info",
      title: "Future live routing hook",
      detail: "This is heuristic only. OSRM/open routing estimates can refine these when saved coordinates are available.",
    });
  }
  return suggestions;
}

function TripSwitcher({
  activeTripId,
  activeView,
  setActiveTripId,
  openDiscovery,
}: {
  activeTripId: TripId;
  activeView: AppView;
  setActiveTripId: (id: TripId) => void;
  openDiscovery: () => void;
}) {
  const labels: Record<TripId, string> = {
    "japan-2026": "Japan Trip",
    "peru-2026": "Peru Trip",
    "portugal-2026": "Portugal Trip",
  };
  return (
    <div className="trip-switcher" aria-label="Trip switcher">
      {tripOrder.map((tripId) => (
        <button key={tripId} type="button" className={activeTripId === tripId && activeView !== "discovery" ? "active" : ""} onClick={() => setActiveTripId(tripId)}>
          {labels[tripId]}
        </button>
      ))}
      <button type="button" className={activeView === "discovery" ? "active discovery-global-button" : "discovery-global-button"} onClick={openDiscovery}>
        Discovery
      </button>
    </div>
  );
}

function DayRail({
  days,
  activities,
  selectedDay,
  setSelectedDay,
  onJumpToDay,
  jumpMode,
  trip,
  exchangeRate,
}: {
  days: number[];
  activities: TripActivity[];
  selectedDay: number | "All";
  setSelectedDay: (day: number | "All") => void;
  onJumpToDay?: (day: number) => void;
  jumpMode?: boolean;
  trip: Trip;
  exchangeRate: number;
}) {
  return (
    <section className="day-rail" aria-label="Day selector">
      <button
        type="button"
        className={selectedDay === "All" ? "day-chip active" : "day-chip"}
        onClick={() => setSelectedDay("All")}
      >
        <CalendarDays size={17} aria-hidden="true" />
        <span>All days</span>
        <small>{activities.length} stops</small>
      </button>
      {days.map((day) => {
        const dayActivities = activities.filter((activity) => activity.day === day);
        const pacing = dayScore(dayActivities);
        const first = dayActivities[0];
        const total = sumRanges(dayActivities.map(activityRange)).mid;
        return (
          <button
            key={day}
            type="button"
            className={selectedDay === day ? "day-chip active" : "day-chip"}
            onClick={() => (jumpMode && onJumpToDay ? onJumpToDay(day) : setSelectedDay(day))}
          >
            <span>Day {day}</span>
            <small>{first?.date ? formatDate(first.date) : first?.city || trip.country}</small>
            <em>{trip.id === "peru-2026" ? `${dayActivities.length} stops` : `${dayActivities.length} stops · ${formatMoney(total, trip.currency, exchangeRate)}`}</em>
            <i className={`pacing-dot ${pacing.tone}`} aria-label={pacing.label} />
          </button>
        );
      })}
    </section>
  );
}

function ThemeToggle({ preference, resolvedTheme, setPreference }: { preference: ThemePreference; resolvedTheme: string; setPreference: (preference: ThemePreference) => void }) {
  const next = preference === "dark" ? "light" : "dark";
  return (
    <button className="ghost-button" type="button" onClick={() => setPreference(next)} title="Toggle theme">
      {resolvedTheme === "dark" ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
      {preference === "dark" ? "Dark" : "Light"}
    </button>
  );
}

function BranchToggle({ branch, setBranch, cadToJpy }: { branch: TripBranch; setBranch: (branch: TripBranch) => void; cadToJpy: number }) {
  return (
    <div className="branch-toggle">
      <div className="branch-copy">
        <p className="eyebrow">Days 25-28 branch</p>
        <strong>{branch === "hokkaido" ? "Hokkaido: cooler, big landscapes" : "Kyushu: onsen, food, warmer weather"}</strong>
        <span>Rough budget remains shown in JPY and CAD at {cadToJpy} JPY per CAD.</span>
      </div>
      <div className="button-row">
        <button type="button" className={branch === "hokkaido" ? "active" : ""} onClick={() => setBranch("hokkaido")}>Hokkaido</button>
        <button type="button" className={branch === "kyushu" ? "active" : ""} onClick={() => setBranch("kyushu")}>Kyushu</button>
      </div>
    </div>
  );
}

function FilterBar(props: {
  query: string;
  setQuery: (query: string) => void;
  selectedCategory: TripCategory | "All";
  setSelectedCategory: (category: TripCategory | "All") => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedDay: number | "All";
  setSelectedDay: (day: number | "All") => void;
  cities: string[];
  days: Array<number | "All">;
  addActivity: () => void;
  addRestDay: () => void;
  tripId: TripId;
}) {
  const isBookedTrip = bookedTripIds.has(props.tripId);
  return (
    <section className={`filter-bar ${isBookedTrip ? "peru-filter-bar" : ""}`} aria-label="Trip filters">
      <label className="search-field">
        <Search size={18} aria-hidden="true" />
        <input value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="Search places, notes, addresses" />
      </label>
      <div className="chip-row" aria-label="Category filters">
        {(["All", ...categoryOptions] as Array<TripCategory | "All">).map((category) => (
          <button key={category} className={props.selectedCategory === category ? "chip active" : "chip"} type="button" onClick={() => props.setSelectedCategory(category)}>
            {category}
          </button>
        ))}
      </div>
      {!isBookedTrip && <div className="filter-selects">
        <label className="field">
          <span>City</span>
          <select value={props.selectedCity} onChange={(event) => props.setSelectedCity(event.target.value)}>
            {props.cities.map((city) => <option key={city}>{city}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Day</span>
          <select value={props.selectedDay} onChange={(event) => props.setSelectedDay(event.target.value === "All" ? "All" : Number(event.target.value))}>
            {props.days.map((day) => <option key={day} value={day}>{day === "All" ? "All days" : `Day ${day}`}</option>)}
          </select>
        </label>
        <button className="primary-button" type="button" onClick={props.addActivity}><Plus size={17} aria-hidden="true" /> Add</button>
        <button className="ghost-button" type="button" onClick={props.addRestDay}><CalendarDays size={17} aria-hidden="true" /> Rest day</button>
      </div>}
    </section>
  );
}

function Dashboard({
  trip,
  activities,
  budget,
  exchangeRate,
  routeSuggestions,
  checklistItems,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
}: {
  trip: Trip;
  activities: TripActivity[];
  budget: ReturnType<typeof makeBudget>;
  exchangeRate: number;
  routeSuggestions: RouteSuggestion[];
  checklistItems: ChecklistItem[];
  addChecklistItem: (text: string) => void;
  toggleChecklistItem: (id: string, isDone: boolean) => void;
  deleteChecklistItem: (id: string) => void;
}) {
  const booked = activities.filter((activity) => activity.isBooked).length + trip.flights.filter((flight) => flight.status === "booked" || flight.status === "manual / not live yet").length;
  const incomplete = activities.filter((activity) => !activity.isCompleted).length;
  const nextFlight = trip.flights.find((flight) => new Date(flight.departureTime).getTime() >= Date.now()) || trip.flights[0];
  const nextHotel = trip.hotels[0];
  const totalDays = Math.max(...activities.map((activity) => activity.day), 1);
  const reservationCount = trip.flights.length + trip.hotels.length + activities.filter((activity) => activity.type === "transport" || activity.type === "flight" || activity.category === "Transit" || activity.category === "Flight").length;
  const savedLinks = trip.attachments.length + activities.filter((activity) => activity.googleMapsQuery || activity.sourceUrl || activity.address).length;
  if (bookedTripIds.has(trip.id)) {
    return (
      <section className="content-section peru-overview">
        <div className="booked-overview-layout">
          <div className="booked-overview-main">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{formatDate(trip.startDate)} to {formatDate(trip.endDate)}</p>
                <h2>{trip.title}</h2>
              </div>
              <div className="button-row">
                <button className="ghost-button" type="button" onClick={() => document.querySelector<HTMLButtonElement>(".nav-tabs button:nth-child(2)")?.click()}>
                  Open itinerary
                </button>
                <button className="primary-button" type="button" onClick={() => document.querySelector<HTMLButtonElement>(".nav-tabs button:nth-child(3)")?.click()}>
                  <CalendarDays size={17} aria-hidden="true" /> Open calendar
                </button>
              </div>
            </div>
            <div className="dashboard-grid peru-dashboard-grid">
              <MetricCard label="Budget spent" value={formatCadOnly(budget.total.mid, exchangeRate)} detail={formatLocalOnly(budget.total.mid, trip.currency)} icon={<CircleDollarSign size={18} />} />
              <MetricCard label="Days" value={String(totalDays)} detail={`${activities.length} stops`} icon={<CalendarDays size={18} />} />
              <MetricCard label="Activities" value={String(activities.length)} detail={`${reservationCount} reservations / transport`} icon={<MapPin size={18} />} />
              <MetricCard label="Saved links" value={String(savedLinks)} detail={`${trip.attachments.length} attachments`} icon={<Bookmark size={18} />} />
              <MetricCard label="Booked" value={String(booked)} detail={`${incomplete} incomplete`} icon={<BadgeCheck size={18} />} />
              <MetricCard label="Next stay" value={nextHotel?.name || "No hotel"} detail={nextHotel ? nextHotel.city : "Add lodging later"} icon={<Hotel size={18} />} />
            </div>
            <div className="peru-overview-feature-grid">
              <TripImageSlideshow trip={trip} activities={activities} />
            </div>
            <OverviewLogistics trip={trip} routeSuggestions={routeSuggestions} exchangeRate={exchangeRate} />
            <OverviewChecklist trip={trip} checklistItems={checklistItems} addChecklistItem={addChecklistItem} toggleChecklistItem={toggleChecklistItem} deleteChecklistItem={deleteChecklistItem} />
          </div>
          <TripDestinationMap trip={trip} activities={activities} />
        </div>
      </section>
    );
  }
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Trip dashboard</p>
          <h2>{trip.title}</h2>
        </div>
        <Sparkles size={22} aria-hidden="true" />
      </div>
      <div className="dashboard-grid">
        <MetricCard label="Days" value={String(totalDays)} detail={`${formatDate(trip.startDate)} to ${formatDate(trip.endDate)}`} icon={<CalendarDays size={18} />} />
        <MetricCard label="Budget spent" value={formatCadOnly(budget.total.mid, exchangeRate)} detail={getLocalCostSubtext(budget.total.mid, trip.currency)} icon={<CircleDollarSign size={18} />} />
        <MetricCard label="Activities" value={String(activities.length)} detail={`${reservationCount} reservations / transport`} icon={<MapPin size={18} />} />
        <MetricCard label="Saved links" value={String(savedLinks)} detail={`${trip.attachments.length} attachments`} icon={<Bookmark size={18} />} />
        <MetricCard label="Booked items" value={String(booked)} detail="Includes manual flight records" icon={<BadgeCheck size={18} />} />
        <MetricCard label="Incomplete" value={String(incomplete)} detail="Activities still open" icon={<CheckCircle2 size={18} />} />
        <MetricCard label="Next flight" value={nextFlight ? `${nextFlight.airline} ${nextFlight.flightNumber}` : "Add flight"} detail={nextFlight ? `${nextFlight.departureAirport} to ${nextFlight.arrivalAirport}` : "Manual tracker ready"} icon={<Plane size={18} />} />
        <MetricCard label="Next hotel" value={nextHotel?.name || "Add hotel"} detail={nextHotel ? `${nextHotel.city}, ${nextHotel.country}` : "Lodging tracker ready"} icon={<Hotel size={18} />} />
      </div>

      {trip.id === "japan-2026" ? (
        <div className="overview-grid">
          {tripAnchors.map((anchor) => (
            <article className="anchor-card" key={anchor.title}>
              <h3>{anchor.title}</h3>
              <p>{anchor.body}</p>
            </article>
          ))}
        </div>
      ) : trip.id === "peru-2026" ? (
        <div className="overview-grid">
          {["Altitude first", "Sacred Valley", "Machu Picchu", "Arequipa and Colca", "Coast reset", "Lima buffer"].map((title) => (
            <article className="anchor-card" key={title}>
              <h3>{title}</h3>
              <p>{peruAnchorCopy(title)}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="overview-grid">
          {["Lisbon soft start", "Algarve reset", "Sintra together", "Porto and Douro"].map((title) => (
            <article className="anchor-card" key={title}>
              <h3>{title}</h3>
              <p>{portugalAnchorCopy(title)}</p>
            </article>
          ))}
        </div>
      )}

      <SuggestionList suggestions={routeSuggestions.slice(0, 4)} />
      <OverviewLogistics trip={trip} routeSuggestions={routeSuggestions} exchangeRate={exchangeRate} />
      <OverviewChecklist trip={trip} checklistItems={checklistItems} addChecklistItem={addChecklistItem} toggleChecklistItem={toggleChecklistItem} deleteChecklistItem={deleteChecklistItem} />
    </section>
  );
}

const peruRegionCalendar = [
  { startDay: 1, endDay: 2, region: "Cusco" },
  { startDay: 3, endDay: 4, region: "Sacred Valley" },
  { startDay: 5, endDay: 5, region: "Machu Picchu" },
  { startDay: 6, endDay: 8, region: "Cusco" },
  { startDay: 9, endDay: 12, region: "Arequipa" },
  { startDay: 13, endDay: 14, region: "Huacachina" },
  { startDay: 15, endDay: 16, region: "Lima" },
];

function tripRegionCalendar(trip: Trip) {
  if (trip.id === "portugal-2026") return portugalRegionCalendar;
  return peruRegionCalendar;
}

function TripRegionCalendar({ trip, compact = false }: { trip: Trip; compact?: boolean }) {
  const regionCalendar = tripRegionCalendar(trip);
  const regions = Array.from(new Set(regionCalendar.map((item) => item.region)));
  const baseDate = trip.startDate || "2026-07-01";
  const monthDate = new Date(`${baseDate}T12:00:00`);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12);
  const monthLength = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const monthDays = Array.from({ length: monthLength }, (_, index) => index + 1);
  const firstDayOffset = monthStart.getDay();
  const monthLabel = new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric" }).format(monthStart);
  const calendarSegments = regionCalendar.flatMap((item) => getRegionCalendarSegments(item.startDay, item.endDay, trip.startDate).map((segment, index) => ({ ...item, ...segment, segmentId: `${item.region}-${item.startDay}-${index}` })));
  const totalTripDays = Math.max(1, Math.round((new Date(`${trip.endDate || baseDate}T12:00:00`).getTime() - new Date(`${baseDate}T12:00:00`).getTime()) / 86400000) + 1);
  return (
    <article className={`overview-region-calendar ${compact ? "compact-region-calendar" : ""}`}>
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">{monthLabel}</p>
          <h2>{compact ? "Where we are" : "Where we are each day"}</h2>
        </div>
        <CalendarDays size={20} aria-hidden="true" />
      </div>
      <div className="region-month-calendar" aria-label={`${trip.title} region calendar`}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
          <span className="region-month-weekday" key={weekday}>{weekday}</span>
        ))}
        <div className="region-month-grid">
          {monthDays.map((day) => {
            const gridIndex = day + firstDayOffset;
            const row = Math.floor((gridIndex - 1) / 7) + 1;
            const column = ((gridIndex - 1) % 7) + 1;
            const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day, 12).toISOString().slice(0, 10);
            const isTripDay = Boolean(trip.startDate && trip.endDate && date >= trip.startDate && date <= trip.endDate);
            return (
              <div
                key={day}
                className={`region-month-day ${isTripDay ? "trip-date" : ""}`}
                style={{ gridColumn: column, gridRow: row }}
              >
                <span>{day}</span>
              </div>
            );
          })}
          {calendarSegments.map((item) => {
            const startDateLabel = dateForTripDay(trip.startDate, item.startDay);
            const endDateLabel = dateForTripDay(trip.startDate, item.endDay);
            const ariaLabel = `${item.region}, ${startDateLabel ? formatCalendarDate(startDateLabel) : `day ${item.startDay}`} to ${endDateLabel ? formatCalendarDate(endDateLabel) : `day ${item.endDay}`}`;
            return (
              <div
                key={item.segmentId}
                className={`region-span region-${item.region.toLowerCase().replace(/\s+/g, "-")}`}
                style={{ gridColumn: `${item.startCol} / ${item.endCol + 1}`, gridRow: item.row }}
                aria-label={ariaLabel}
                title={ariaLabel}
              >
                {item.region}
              </div>
            );
          })}
        </div>
      </div>
      {!compact && (
        <div className="region-calendar-grid" aria-label={`${trip.country} region calendar by trip day`}>
          {Array.from({ length: totalTripDays }, (_, index) => {
            const day = index + 1;
            const region = regionCalendar.find((item) => day >= item.startDay && day <= item.endDay)?.region || trip.country;
            const date = dateForTripDay(trip.startDate, day);
          return (
            <div key={day} className={`region-day region-${region.toLowerCase().replace(/\s+/g, "-")}`}>
              <span>Day {day}</span>
              <strong>{region}</strong>
              <small>{date ? formatCalendarDate(date) : "July 2026"}</small>
            </div>
          );
          })}
        </div>
      )}
      {!compact && (
        <div className="region-calendar-legend" aria-label="Calendar regions">
          {regions.map((region) => (
            <span key={region} className={`region-dot region-${region.toLowerCase().replace(/\s+/g, "-")}`}>{region}</span>
          ))}
        </div>
      )}
    </article>
  );
}

function getRegionCalendarSegments(startDay: number, endDay: number, tripStartDate = "2026-07-11") {
  const segments: Array<{ row: number; startCol: number; endCol: number }> = [];
  let cursor = startDay;
  while (cursor <= endDay) {
    const date = dateForTripDay(tripStartDate, cursor);
    const dateObject = date ? new Date(`${date}T12:00:00`) : undefined;
    const monthStart = dateObject ? new Date(dateObject.getFullYear(), dateObject.getMonth(), 1, 12) : undefined;
    const firstDayOffset = monthStart?.getDay() || 0;
    const weekRow = dateObject ? Math.floor((dateObject.getDate() + firstDayOffset - 1) / 7) + 1 : 1;
    const startCol = dateObject ? dateObject.getDay() + 1 : 1;
    const daysLeftInWeek = 8 - startCol;
    const segmentLength = Math.min(daysLeftInWeek, endDay - cursor + 1);
    segments.push({ row: weekRow, startCol, endCol: startCol + segmentLength - 1 });
    cursor += segmentLength;
  }
  return segments;
}

type CalendarEventKind = "activity" | "food" | "hotel" | "flight" | "transport" | "note";

interface TripCalendarEvent {
  id: string;
  date: string;
  day?: number;
  title: string;
  city: string;
  kind: CalendarEventKind;
  category: TripCategory | "Stay";
  startTime?: string;
  endTime?: string;
  duration?: string;
  route?: string;
  costLocal?: number;
  currency: string;
  status?: string;
  address?: string;
  notes?: string;
  source: "activity" | "flight" | "hotel";
}

function addIsoDays(date: string, amount: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + amount);
  return next.toISOString().slice(0, 10);
}

function enumerateDates(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return [];
  const dates: string[] = [];
  for (let cursor = startDate; cursor <= endDate; cursor = addIsoDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

function calendarKind(activity: TripActivity): CalendarEventKind {
  if (activity.type === "flight" || activity.category === "Flight") return "flight";
  if (activity.type === "hotel" || activity.category === "Hotel") return "hotel";
  if (activity.type === "transport" || activity.category === "Transit") return "transport";
  if (activity.type === "food" || activity.category === "Food") return "food";
  if (activity.type === "note" || activity.category === "Note") return "note";
  return "activity";
}

function sortCalendarEvents(events: TripCalendarEvent[]) {
  const kindWeight: Record<CalendarEventKind, number> = { flight: 0, hotel: 1, transport: 2, activity: 3, food: 4, note: 5 };
  return [...events].sort((a, b) => {
    const timeA = a.startTime ? Number(a.startTime.replace(":", "")) : 9999;
    const timeB = b.startTime ? Number(b.startTime.replace(":", "")) : 9999;
    if (timeA !== timeB) return timeA - timeB;
    if (kindWeight[a.kind] !== kindWeight[b.kind]) return kindWeight[a.kind] - kindWeight[b.kind];
    return a.title.localeCompare(b.title);
  });
}

function makeCalendarEvents(trip: Trip, activities: TripActivity[], exchangeRate: number): TripCalendarEvent[] {
  const activityEvents = activities.map((activity): TripCalendarEvent => {
    const localCost = activity.costLocal ?? activity.estimatedCost;
    return {
      id: `activity-${activity.id}`,
      date: activity.date || dateForTripDay(trip.startDate, activity.day) || trip.startDate || "",
      day: activity.day,
      title: activity.title,
      city: activity.city,
      kind: calendarKind(activity),
      category: activity.category,
      startTime: activity.startTime,
      endTime: activity.endTime,
      duration: activity.duration,
      route: routeTimeLabel(activity),
      costLocal: localCost || undefined,
      currency: activity.localCurrencyCode || activity.currency,
      status: activityStatusLabel(activity),
      address: activity.address,
      notes: cleanUiText(activity.notes || activity.description),
      source: "activity",
    };
  });

  const flightEvents = trip.flights.map((flight): TripCalendarEvent => ({
    id: `flight-${flight.id}`,
    date: flight.departureTime.slice(0, 10),
    title: `${flight.airline} ${flight.flightNumber}`,
    city: flight.departureAirport,
    kind: "flight",
    category: "Flight",
    startTime: flight.departureTime.slice(11, 16),
    endTime: flight.arrivalTime.slice(11, 16),
    duration: `${flight.departureAirport} to ${flight.arrivalAirport}`,
    route: "Flight",
    costLocal: flight.costLocal ?? (flight.costCad ? Math.round(flight.costCad * exchangeRate) : undefined),
    currency: flight.localCurrencyCode || trip.currency,
    status: flight.status,
    notes: cleanUiText(flight.notes || ""),
    source: "flight",
  }));

  const hotelEvents = trip.hotels.flatMap((hotel): TripCalendarEvent[] => {
    if (!hotel.checkIn) return [];
    const events: TripCalendarEvent[] = [];
    const end = hotel.checkOut || hotel.checkIn;
    const stayDates = enumerateDates(hotel.checkIn, addIsoDays(end, -1));
    stayDates.forEach((date, index) => {
      events.push({
        id: `hotel-${hotel.id}-${date}`,
        date,
        title: index === 0 ? `Check in: ${hotel.name}` : `Stay: ${hotel.name}`,
        city: hotel.city,
        kind: "hotel",
        category: "Stay",
        costLocal: index === 0 ? hotel.costLocal ?? hotel.estimatedCost : undefined,
        currency: hotel.localCurrencyCode || hotel.currency,
        status: hotel.confirmation ? "Booked" : "Stay",
        address: hotel.address,
        notes: cleanUiText(hotel.notes || ""),
        source: "hotel",
      });
    });
    if (hotel.checkOut) {
      events.push({
        id: `hotel-${hotel.id}-checkout`,
        date: hotel.checkOut,
        title: `Check out: ${hotel.name}`,
        city: hotel.city,
        kind: "hotel",
        category: "Stay",
        currency: hotel.localCurrencyCode || hotel.currency,
        status: "Check-out",
        address: hotel.address,
        notes: cleanUiText(hotel.notes || ""),
        source: "hotel",
      });
    }
    return events;
  });

  return [...activityEvents, ...flightEvents, ...hotelEvents].filter((event) => event.date);
}

function formatCalendarDate(date: string, includeYear = false) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(new Date(`${date}T12:00:00`));
}

function calendarMonthCells(monthDate: string) {
  const base = new Date(`${monthDate.slice(0, 7)}-01T12:00:00`);
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1, 12);
  const startOffset = first.getDay();
  const cells: Array<{ date: string; inMonth: boolean }> = [];
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    cells.push({
      date: date.toISOString().slice(0, 10),
      inMonth: date.getMonth() === month,
    });
  }
  return cells;
}

function icsDate(date: string, time?: string) {
  const compactDate = date.replace(/-/g, "");
  if (!time) return compactDate;
  return `${compactDate}T${time.replace(":", "")}00`;
}

function escapeIcs(text = "") {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function downloadTripIcs(trip: Trip, events: TripCalendarEvent[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Itinerary Mate//Peru Trip//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  events.forEach((event) => {
    const description = [event.duration, event.route, event.notes].filter(Boolean).join(" | ");
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcs(event.id)}@itinerary-mate`);
    lines.push(`DTSTAMP:${stamp}`);
    if (event.startTime) {
      lines.push(`DTSTART:${icsDate(event.date, event.startTime)}`);
      lines.push(`DTEND:${icsDate(event.date, event.endTime || event.startTime)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(event.date)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDate(addIsoDays(event.date, 1))}`);
    }
    lines.push(`SUMMARY:${escapeIcs(event.title)}`);
    if (event.address || event.city) lines.push(`LOCATION:${escapeIcs(event.address || event.city)}`);
    if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`);
    lines.push(`CATEGORIES:${escapeIcs(event.kind)}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${trip.id}-calendar.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function TripCalendar({ trip, activities, exchangeRate, openItineraryDay }: { trip: Trip; activities: TripActivity[]; exchangeRate: number; openItineraryDay: (day: number) => void }) {
  const tripDates = useMemo(() => enumerateDates(trip.startDate, trip.endDate), [trip.endDate, trip.startDate]);
  const [selectedDate, setSelectedDate] = useState(trip.startDate || tripDates[0] || "");
  const events = useMemo(() => makeCalendarEvents(trip, activities, exchangeRate), [activities, exchangeRate, trip]);
  const eventsByDate = useMemo(
    () =>
      events.reduce<Record<string, TripCalendarEvent[]>>((acc, event) => {
        acc[event.date] = sortCalendarEvents([...(acc[event.date] || []), event]);
        return acc;
      }, {}),
    [events],
  );
  const selectedEvents = eventsByDate[selectedDate] || [];
  const activityEvents = selectedEvents.filter((event) => event.source === "activity");
  const selectedDay = activityEvents[0]?.day || activities.find((activity) => activity.date === selectedDate)?.day;
  const selectedCost = activityEvents.reduce((sum, event) => sum + (event.costLocal || 0), 0);
  const monthCells = calendarMonthCells(trip.startDate || selectedDate || "2026-07-01");
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const tightDays = new Set(
    tripDates.filter((date) => {
      const dayEvents = eventsByDate[date] || [];
      const transitCount = dayEvents.filter((event) => event.kind === "flight" || event.kind === "transport").length;
      return dayEvents.length >= 6 || transitCount >= 2;
    }),
  );

  return (
    <section className="content-section trip-calendar">
      <div className="calendar-hero">
        <div>
          <p className="eyebrow">Booked trip calendar</p>
          <h2>{trip.country} schedule at a glance</h2>
          <p>Flights, stays, route days, costs, and flexible stops in one place.</p>
        </div>
        <div className="calendar-actions">
          <button className="primary-button" type="button" onClick={() => downloadTripIcs(trip, events)}>
            <Download size={17} aria-hidden="true" /> Export .ics
          </button>
          {selectedDay && (
            <button className="ghost-button" type="button" onClick={() => openItineraryDay(selectedDay)}>
              Open Day {selectedDay}
            </button>
          )}
        </div>
      </div>

      <div className="trip-date-strip" aria-label="Peru trip dates">
        {tripDates.map((date, index) => {
          const dayEvents = eventsByDate[date] || [];
          return (
            <button key={date} type="button" className={selectedDate === date ? "trip-date active" : "trip-date"} onClick={() => setSelectedDate(date)}>
              <span>Day {index + 1}</span>
              <strong>{formatCalendarDate(date)}</strong>
              <small>{dayEvents.length} items</small>
            </button>
          );
        })}
      </div>

      <div className="calendar-layout">
        <section className="month-card" aria-label={`${trip.title} calendar`}>
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Month view</p>
              <h3>{new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric" }).format(new Date(`${trip.startDate || selectedDate || "2026-07-01"}T12:00:00`))}</h3>
            </div>
            <span>{events.length} calendar items</span>
          </div>
          <div className="month-grid weekday-grid" aria-hidden="true">
            {weekdayLabels.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="month-grid">
            {monthCells.map((cell) => {
              const dayEvents = eventsByDate[cell.date] || [];
              const inTrip = tripDates.includes(cell.date);
              return (
                <button
                  key={cell.date}
                  type="button"
                  className={`month-cell ${cell.inMonth ? "" : "muted"} ${inTrip ? "in-trip" : ""} ${selectedDate === cell.date ? "active" : ""}`}
                  onClick={() => setSelectedDate(cell.date)}
                >
                  <span>{Number(cell.date.slice(-2))}</span>
                  <div className="calendar-pills">
                    {dayEvents.slice(0, 4).map((event) => (
                      <i key={event.id} className={`calendar-pill event-${event.kind}`}>{event.kind === "transport" ? "Transit" : event.kind}</i>
                    ))}
                    {dayEvents.length > 4 && <i className="calendar-pill more-pill">+{dayEvents.length - 4}</i>}
                  </div>
                  {tightDays.has(cell.date) && <em>Tight</em>}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="agenda-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">{selectedDay ? `Day ${selectedDay}` : "Selected day"}</p>
              <h3>{selectedDate ? formatCalendarDate(selectedDate, true) : "Pick a date"}</h3>
            </div>
            <strong>
              {selectedCost ? formatCadOnly(selectedCost, exchangeRate) : "$0 CAD"}
              {selectedCost ? <small>{formatLocalOnly(selectedCost, trip.currency)}</small> : null}
            </strong>
          </div>
          {tightDays.has(selectedDate) && (
            <div className="calendar-warning">
              <TriangleAlert size={16} aria-hidden="true" />
              Tight logistics day. Keep buffers visible.
            </div>
          )}
          {selectedEvents.length ? (
            <div className="agenda-list">
              {selectedEvents.map((event) => (
                <article className={`agenda-item event-${event.kind}`} key={event.id}>
                  <div className="agenda-time">
                    <strong>{event.startTime || "All day"}</strong>
                    {event.endTime && <span>{event.endTime}</span>}
                  </div>
                  <div>
                    <p className="eyebrow">{event.city} · {event.category}</p>
                    <h4>{event.title}</h4>
                    {(event.duration || event.route) && <p>{event.duration || event.route}{event.duration && event.route ? ` · ${event.route}` : ""}</p>}
                    {event.address && <p className="address-line"><MapPin size={14} aria-hidden="true" /> {event.address}</p>}
                    <div className="meta-chips">
                      {event.costLocal ? (
                        <span className="cost-chip"><CircleDollarSign size={14} /><b>{formatCadOnly(event.costLocal, exchangeRate)}</b><small>{formatLocalOnly(event.costLocal, event.currency)}</small></span>
                      ) : (
                        <span><CircleDollarSign size={14} /> Cost not set</span>
                      )}
                      {event.status && <span><BadgeCheck size={14} /> {event.status}</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing scheduled" body={`This date is outside the imported ${trip.country} plan or has no saved items yet.`} />
          )}
        </aside>
      </div>
    </section>
  );
}

function TripDestinationMap({ trip, activities }: { trip: Trip; activities: TripActivity[] }) {
  const [fitNonce, setFitNonce] = useState(0);
  const destinationStops = activities
    .filter((activity) =>
      activity.country === trip.country &&
      activity.latitude !== undefined &&
      activity.longitude !== undefined &&
      activity.type !== "flight" &&
      activity.category !== "Flight"
    )
    .filter((activity, index, list) => list.findIndex((item) => item.title === activity.title && item.city === activity.city) === index);

  if (!destinationStops.length) {
    return <EmptyState title={`No ${trip.country} map pins yet`} body={`${trip.country} destinations with saved coordinates will appear here.`} />;
  }

  return (
    <article className="overview-map-card">
      <div className="easy-overview-map-toolbar" aria-label={`${trip.country} map controls`}>
        <label className="easy-map-search">
          <Search size={15} aria-hidden="true" />
          <span>Search places...</span>
        </label>
        <select aria-label="Map day filter" value="all" onChange={() => undefined}>
          <option value="all">All Days</option>
        </select>
        <a href={googleMapUrl(destinationStops[0])} target="_blank" rel="noreferrer" title="Open first stop in maps">
          <MapPin size={15} aria-hidden="true" />
        </a>
        <button type="button" title="Fit all markers" onClick={() => setFitNonce((value) => value + 1)}>
          <MapIcon size={15} aria-hidden="true" />
        </button>
      </div>
      <LeafletActivityMap
        trip={trip}
        stops={destinationStops}
        fitNonce={fitNonce}
        className="overview-map-canvas leaflet-overview-map"
        ariaLabel={`Interactive map of ${trip.country} destinations`}
      />
      <div className="easy-map-caption">
        <div>
          <p className="eyebrow">{trip.country} map</p>
          <h2>Destinations in {trip.country}</h2>
        </div>
        <span>{destinationStops.length} pins</span>
      </div>
      <p className="easy-map-attribution">Leaflet | OSM | CARTO</p>
    </article>
  );
}

function LeafletActivityMap({
  trip,
  stops,
  fitNonce = 0,
  className = "leaflet-activity-map",
  ariaLabel,
}: {
  trip: Trip;
  stops: TripActivity[];
  fitNonce?: number;
  className?: string;
  ariaLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const stopsRef = useRef(stops);

  useEffect(() => {
    stopsRef.current = stops;
  }, [stops]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initialView = overviewLeafletView(trip);
    const map = L.map(containerRef.current, {
      center: initialView.center,
      zoom: initialView.zoom,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: true,
      scrollWheelZoom: true,
      worldCopyJump: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    window.setTimeout(() => {
      map.invalidateSize();
      fitLeafletStops(map, stopsRef.current, false);
    }, 80);

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, [trip.id]);

  useEffect(() => {
    const markerLayer = markerLayerRef.current;
    if (!markerLayer) return;
    markerLayer.clearLayers();
    stops.forEach((activity, index) => {
      if (activity.latitude === undefined || activity.longitude === undefined) return;
      const marker = L.marker([activity.latitude, activity.longitude], {
        icon: L.divIcon({
          className: "",
          html: `<span class="leaflet-trip-marker marker-${pinKind(activity)}">${index + 1}</span>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        }),
        title: activity.title,
      });
      marker.bindPopup(`
        <strong>${escapeHtml(activity.title)}</strong>
        <span>${escapeHtml(activity.city)}${activity.region ? `, ${escapeHtml(activity.region)}` : ""}</span>
        <a href="${googleMapUrl(activity)}" target="_blank" rel="noreferrer">Open map search</a>
      `);
      markerLayer.addLayer(marker);
    });
    const map = mapRef.current;
    if (map) {
      window.setTimeout(() => fitLeafletStops(map, stopsRef.current, false), 40);
    }
  }, [stops]);

  useEffect(() => {
    if (!fitNonce || !mapRef.current) return;
    fitLeafletStops(mapRef.current, stopsRef.current, true);
  }, [fitNonce]);

  return <div ref={containerRef} className={className} aria-label={ariaLabel} />;
}

function LazyLeafletActivityMap({
  trip,
  stops,
  className,
  ariaLabel,
}: {
  trip: Trip;
  stops: TripActivity[];
  className: string;
  ariaLabel: string;
}) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) return;
    const node = shellRef.current;
    if (!node || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "260px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible]);

  if (isVisible) {
    return <LeafletActivityMap trip={trip} stops={stops} className={className} ariaLabel={ariaLabel} />;
  }

  return (
    <div ref={shellRef} className={`${className} lazy-map-placeholder`} aria-label={ariaLabel}>
      <MapPin size={18} aria-hidden="true" />
      <span>Map loads as you scroll</span>
    </div>
  );
}

function overviewLeafletView(trip: Trip): { center: L.LatLngExpression; zoom: number } {
  if (trip.id === "portugal-2026") return { center: [39.6, -8.8], zoom: 6 };
  if (trip.id === "peru-2026") return { center: [-9.2, -74.5], zoom: 5 };
  return { center: [35.7, 139.7], zoom: 5 };
}

function fitLeafletStops(map: L.Map, stops: TripActivity[], animate = true) {
  const latLngs = stops
    .filter((activity) => activity.latitude !== undefined && activity.longitude !== undefined)
    .map((activity) => [activity.latitude!, activity.longitude!] as L.LatLngTuple);
  if (!latLngs.length) return;
  map.fitBounds(L.latLngBounds(latLngs).pad(0.18), { animate, maxZoom: 11 });
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
}

function TripImageSlideshow({ trip, activities }: { trip: Trip; activities: TripActivity[] }) {
  const curatedSlides = tripHeroSlides[trip.id] || [];
  const slides = useMemo(
    () => {
      const activitySlides = activities
        .filter((activity) => activity.country === trip.country && isImageUrl(activity.imageUrl) && activity.type !== "flight" && activity.category !== "Flight")
        .filter((activity, index, list) => list.findIndex((item) => item.title === activity.title) === index)
        .map((activity) => ({ id: activity.id, title: activity.title, city: activity.city, imageUrl: activity.imageUrl, imageAlt: activity.imageAlt || activity.title }));
      return [...curatedSlides, ...activitySlides].filter((slide, index, list) => list.findIndex((item) => item.imageUrl === slide.imageUrl) === index).slice(0, 10);
    },
    [activities, curatedSlides, trip.country],
  );
  const [slideIndex, setSlideIndex] = useState(0);
  const [brokenSlides, setBrokenSlides] = useState<Set<string>>(() => new Set());

  const visibleSlides = useMemo(() => slides.filter((slide) => !brokenSlides.has(slide.id)), [brokenSlides, slides]);

  useEffect(() => {
    if (visibleSlides.length <= 1) return;
    const timer = window.setInterval(() => setSlideIndex((index) => (index + 1) % visibleSlides.length), 4200);
    return () => window.clearInterval(timer);
  }, [visibleSlides.length]);

  useEffect(() => {
    setSlideIndex(0);
    setBrokenSlides(new Set());
  }, [trip.id]);

  if (!visibleSlides.length) {
    return <EmptyState title="No destination photos yet" body={`Real ${trip.country} place images will appear here when available.`} />;
  }

  const active = visibleSlides[slideIndex % visibleSlides.length];
  return (
    <article className="overview-slideshow-card">
      <img
        src={active.imageUrl}
        alt={active.imageAlt || active.title}
        loading="lazy"
        decoding="async"
        onError={() => setBrokenSlides((current) => new Set(current).add(active.id))}
      />
      <div className="slideshow-caption">
        <p className="eyebrow">Look forward to</p>
        <h2>{active.title}</h2>
        <span>{active.city}</span>
      </div>
      <div className="slideshow-dots" aria-label="Slideshow position">
        {visibleSlides.map((slide, index) => (
          <button key={slide.id} type="button" className={index === slideIndex ? "active" : ""} onClick={() => setSlideIndex(index)} aria-label={`Show ${slide.title}`} />
        ))}
      </div>
    </article>
  );
}

const tripHeroSlides: Partial<Record<TripId, Array<{ id: string; title: string; city: string; imageUrl: string; imageAlt: string }>>> = {
  "portugal-2026": [
    {
      id: "portugal-hero-belem",
      title: "Belém Tower",
      city: "Lisbon",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Lisbon_Torre_de_Bel%C3%A9m_BW_2018-10-03_16-33-21.jpg",
      imageAlt: "Belém Tower in Lisbon.",
    },
    {
      id: "portugal-hero-piedade",
      title: "Ponta da Piedade",
      city: "Lagos",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Ponta_da_Piedade%2C_Lagos_%2820518421738%29.jpg",
      imageAlt: "Ponta da Piedade cliffs in Lagos.",
    },
    {
      id: "portugal-hero-pena",
      title: "Pena Palace",
      city: "Sintra",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/Palacio_Nacional_da_Pena%2C_Sintra%2C_Portugal%2C_2019-05-25%2C_DD_131.jpg",
      imageAlt: "Pena Palace in Sintra.",
    },
    {
      id: "portugal-hero-ribeira",
      title: "Ribeira",
      city: "Porto",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bb/Cais_da_Ribeira%2C_Oporto%2C_Portugal%2C_2012-05-09%2C_DD_05.JPG",
      imageAlt: "Ribeira waterfront in Porto.",
    },
    {
      id: "portugal-hero-douro",
      title: "Douro Valley",
      city: "Douro Valley",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/04/Douro_Valley%2C_Portugal_%2853973809897%29.jpg",
      imageAlt: "Vineyards in the Douro Valley.",
    },
  ],
};

function OverviewLogistics({ trip, routeSuggestions, exchangeRate }: { trip: Trip; routeSuggestions: RouteSuggestion[]; exchangeRate: number }) {
  const transferSuggestions = routeSuggestions.filter((suggestion) => suggestion.severity === "warning").slice(0, 3);
  const transferActivities = trip.activities.filter((activity) => activity.type === "transport" || activity.type === "flight" || activity.category === "Transit" || activity.category === "Flight").slice(0, 4);
  return (
    <section className="overview-logistics">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Logistics</p>
          <h2>Flights, stays, transfers</h2>
        </div>
        <Plane size={20} aria-hidden="true" />
      </div>
      <div className="overview-logistics-grid">
        <div>
          <h3>Flights</h3>
          {trip.flights.length ? trip.flights.slice(0, 3).map((flight) => <FlightCard key={flight.id} flight={flight} exchangeRate={exchangeRate} tripCurrency={trip.currency} />) : <EmptyState title="No flights yet" body="Flight records can be added later." />}
        </div>
        <div>
          <h3>Hotels / stays</h3>
          {trip.hotels.length ? trip.hotels.slice(0, 4).map((hotel) => (
            <article className="overview-mini-card" key={hotel.id}>
              <strong>{hotel.name}</strong>
              <span>{hotel.city} · {hotel.checkIn || "Check-in TBD"}</span>
            </article>
          )) : <EmptyState title="No hotels yet" body="Stays will appear here." />}
        </div>
        <div>
          <h3>Transfers</h3>
          {(transferActivities.length ? transferActivities : []).map((activity) => (
            <article className="overview-mini-card" key={activity.id}>
              <strong>{activity.title}</strong>
              <span>{routeTimeLabel(activity) || activity.duration || "Timing not set"}</span>
            </article>
          ))}
          {!transferActivities.length && transferSuggestions.length ? transferSuggestions.map((suggestion) => (
            <article className="overview-mini-card" key={suggestion.id}>
              <strong>{suggestion.title}</strong>
              <span>{suggestion.detail}</span>
            </article>
          )) : null}
          {!transferActivities.length && !transferSuggestions.length && <EmptyState title="No transfers yet" body="Route notes will appear here." />}
        </div>
        <div>
          <h3>Attachments</h3>
          {trip.attachments.length ? trip.attachments.slice(0, 3).map((attachment) => <AttachmentCard key={attachment.id} attachment={attachment} />) : <EmptyState title="No attachments yet" body="Tickets and confirmations can be linked later." />}
        </div>
      </div>
    </section>
  );
}

function OverviewChecklist({
  trip,
  checklistItems,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
}: {
  trip: Trip;
  checklistItems: ChecklistItem[];
  addChecklistItem: (text: string) => void;
  toggleChecklistItem: (id: string, isDone: boolean) => void;
  deleteChecklistItem: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"active" | "archive">("active");
  const activeItems = checklistItems.filter((item) => !item.isDone);
  const archivedItems = checklistItems.filter((item) => item.isDone);
  const visibleItems = tab === "active" ? activeItems : archivedItems;

  function submitItem(event: FormEvent) {
    event.preventDefault();
    addChecklistItem(text);
    setText("");
    setTab("active");
  }

  return (
    <section className="overview-logistics overview-checklist">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Checklist</p>
          <h2>Small things to keep track of</h2>
        </div>
        <Clipboard size={20} aria-hidden="true" />
      </div>
      <form className="checklist-add-row" onSubmit={submitItem}>
        <label>
          <span className="sr-only">Add checklist item</span>
          <input value={text} onChange={(event) => setText(event.target.value)} placeholder={`Add a ${trip.country} task`} />
        </label>
        <button className="primary-button" type="submit"><Plus size={16} aria-hidden="true" /> Add</button>
      </form>
      <div className="checklist-tabs" role="tablist" aria-label={`${trip.title} checklist views`}>
        <button type="button" className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>Active <span>{activeItems.length}</span></button>
        <button type="button" className={tab === "archive" ? "active" : ""} onClick={() => setTab("archive")}>Archive <span>{archivedItems.length}</span></button>
      </div>
      {visibleItems.length ? (
        <div className="checklist-grid">
          {visibleItems.map((item) => (
            <article className={`checklist-row ${item.isDone ? "is-done" : ""}`} key={item.id}>
              <label>
                <input type="checkbox" checked={item.isDone} onChange={(event) => toggleChecklistItem(item.id, event.target.checked)} />
                <span>{item.text}</span>
              </label>
              <div className="checklist-actions">
                {item.isDone && (
                  <button type="button" className="icon-button" onClick={() => toggleChecklistItem(item.id, false)} title="Restore task">
                    <RotateCcw size={15} aria-hidden="true" />
                  </button>
                )}
                <button type="button" className="icon-button" onClick={() => deleteChecklistItem(item.id)} title="Delete task">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title={tab === "active" ? "Nothing active" : "Archive is empty"} body={tab === "active" ? "Add a task above or restore one from Archive." : "Completed tasks will move here."} />
      )}
    </section>
  );
}

function makeDefaultChecklistState(): Record<TripId, ChecklistItem[]> {
  const trips = [buildJapanTrip(), peruTrip, portugalTrip];
  return trips.reduce((acc, trip) => {
    acc[trip.id] = tripChecklistItems(trip).map((text, index) => ({
      id: `${trip.id}-default-${index + 1}`,
      tripId: trip.id,
      text,
      isDone: false,
    }));
    return acc;
  }, {} as Record<TripId, ChecklistItem[]>);
}

function tripChecklistItems(trip: Trip) {
  if (trip.id === "peru-2026") {
    return ["Passport, adapters, rain shell, altitude basics", "Confirm drivers and train timing", "Save flight and hotel confirmations", "Download offline maps for Cusco and Sacred Valley"];
  }
  if (trip.id === "portugal-2026") {
    return ["Confirm Lagos return transport", "Book Sintra tickets and Douro day", "Save hostel and flight confirmations", "Pack beach shoes, sunscreen, and light layers"];
  }
  return ["Pick priority cities before booking", "Save favorite places from Explore", "Check September weather and typhoon backups", "Add flight and stay confirmations later"];
}

function peruAnchorCopy(title: string) {
  const copy: Record<string, string> = {
    "Altitude first": "Cusco starts the trip high, so the first night should stay quiet.",
    "Sacred Valley": "Pisac, Moray, Maras, and Ollantaytambo make the mountain rhythm click.",
    "Machu Picchu": "This is the anchor day. Protect the timing and keep the rest simple.",
    "Arequipa and Colca": "White-stone city time, then a canyon overnight.",
    "Coast reset": "Paracas and Huacachina give the trip a totally different texture.",
    "Lima buffer": "A flexible final day for food, packing, and getting home without chaos.",
  };
  return copy[title];
}

function portugalAnchorCopy(title: string) {
  const copy: Record<string, string> = {
    "Lisbon soft start": "Solo Lisbon first, then Lisbon together after Rachel lands. Keep the arrival days light.",
    "Algarve reset": "Lagos is the beach and hostel-social stretch. Protect Ponta da Piedade and one adventure day.",
    "Sintra together": "Regaleira plus Monserrate is the calmer couple plan. Pena stays optional.",
    "Porto and Douro": "Porto gets the anniversary feel; Douro is the long scenic day to book early.",
  };
  return copy[title];
}

function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <p className="eyebrow">{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

function ItineraryTimeline(props: {
  days: number[];
  activities: TripActivity[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  updateActivity: (id: string, patch: Partial<TripActivity>) => void;
  deleteActivity: (id: string) => void;
  brokenImageIds: Set<string>;
  setBrokenImageIds: Dispatch<SetStateAction<Set<string>>>;
  loadedImageIds: Set<string>;
  setLoadedImageIds: Dispatch<SetStateAction<Set<string>>>;
  trip: Trip;
  exchangeRate: number;
}) {
  return (
    <section className={`timeline content-section ${bookedTripIds.has(props.trip.id) ? "wanderlog-timeline" : ""}`}>
      {props.days.map((day) => {
        const dayActivities = props.activities.filter((activity) => activity.day === day);
        const pacing = dayScore(dayActivities);
        const routeSummary =
          bookedTripIds.has(props.trip.id)
            ? tripDayRouteSummary(props.trip, day)
            : dayActivities.map((activity) => activity.city).filter(Boolean).filter((city, index, list) => list.indexOf(city) === index).join(" -> ");
        return (
          <DayDropZone key={day} day={day}>
            <details className="day-details" open>
            <summary className="day-header day-summary">
              <div>
                <p className="eyebrow">Day {day}</p>
                <h2>{dayActivities[0]?.city || "Open day"}</h2>
                {bookedTripIds.has(props.trip.id) && dayActivities.length > 0 && <span className="route-summary">{routeSummary || "Route needs confirmation"}</span>}
              </div>
              <div className="day-meta">
                <span className={`pacing-pill ${pacing.tone}`}>{pacing.label}</span>
                <span>{formatMoney(sumRanges(dayActivities.map(activityRange)).mid, props.trip.currency, props.exchangeRate)}</span>
              </div>
            </summary>
            {dayActivities.length ? (
              <div className="activity-grid">
                {dayActivities.map((activity, index) => (
                  <div className="timeline-item" key={activity.id}>
                    {index > 0 && (
                      <div className={activity.isRouteEstimate ? "route-connector estimate" : "route-connector"}>
                        <span>{routeTimeLabel(activity) || "Travel time missing"}</span>
                        {activity.isRouteEstimate && <em>estimate</em>}
                      </div>
                    )}
                    <ActivityCard activity={activity} variant="compact" stopNumber={index + 1} {...props} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No plans on this day" body="Add a rest block or move a lower-priority activity here." />
            )}
            </details>
          </DayDropZone>
        );
      })}
    </section>
  );
}

function DayDropZone({ day, children }: { day: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}` });
  return <article id={`itinerary-day-${day}`} ref={setNodeRef} className={isOver ? "day-card drop-active" : "day-card"}>{children}</article>;
}

function JapanExploreBoard({
  places,
  days,
  addPlaceToItinerary,
  brokenImageIds,
  setBrokenImageIds,
  loadedImageIds,
  setLoadedImageIds,
  exchangeRate,
  setSaveStatus,
}: {
  places: JapanExplorePlace[];
  days: number[];
  addPlaceToItinerary: (place: JapanExplorePlace, day: number) => void;
  brokenImageIds: Set<string>;
  setBrokenImageIds: Dispatch<SetStateAction<Set<string>>>;
  loadedImageIds: Set<string>;
  setLoadedImageIds: Dispatch<SetStateAction<Set<string>>>;
  exchangeRate: number;
  setSaveStatus: (status: string) => void;
}) {
  const [kind, setKind] = useState<"All" | JapanExploreKind>("All");
  const [city, setCity] = useState("All");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [targetDayById, setTargetDayById] = useState<Record<string, number>>({});
  const cities = useMemo(() => ["All", ...Array.from(new Set(places.map((place) => place.city))).sort()], [places]);
  const filteredPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((place) => {
      const kindMatch = kind === "All" || place.kind === kind || place.tags.includes(kind);
      const cityMatch = city === "All" || place.city === city;
      const queryMatch =
        !q ||
        [place.title, place.city, place.region, place.neighborhood, place.kind, place.description, place.whyGo, ...place.tags]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return kindMatch && cityMatch && queryMatch;
    });
  }, [city, kind, places, query]);
  const photoCount = filteredPlaces.filter((place) => isImageUrl(place.imageUrl) && !brokenImageIds.has(`japan-explore-${place.id}`)).length;

  async function copyQuery(place: JapanExplorePlace) {
    await copyText(place.googleMapsQuery);
    setSaveStatus(`Copied ${place.title} map query`);
  }

  return (
    <section className="japan-explore content-section">
      <div className="japan-explore-hero">
        <div>
          <p className="eyebrow">Japan ideas, not booked yet</p>
          <h2>Build your shortlist before locking the route.</h2>
          <p>Browse places, food areas, neighborhoods, rainy-day swaps, and branch ideas. Add only the ones that feel worth protecting.</p>
        </div>
        <div className="japan-explore-stats" aria-label="Japan Explore summary">
          <strong>{filteredPlaces.length}</strong>
          <span>visible ideas</span>
          <small>{photoCount} with photos, others use compact safe visuals</small>
        </div>
      </div>

      <div className="japan-explore-toolbar">
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search neighborhoods, food, temples, rainy days" />
        </label>
        <div className="chip-scroll" aria-label="Explore type filters">
          {japanExploreKinds.map((option) => (
            <button key={option} type="button" className={kind === option ? "chip active" : "chip"} onClick={() => setKind(option)}>
              {option}
            </button>
          ))}
        </div>
        <div className="chip-scroll" aria-label="Explore city filters">
          {cities.map((option) => (
            <button key={option} type="button" className={city === option ? "chip active" : "chip"} onClick={() => setCity(option)}>
              {option}
            </button>
          ))}
        </div>
      </div>

      {filteredPlaces.length ? (
        <div className="japan-idea-grid">
          {filteredPlaces.map((place) => (
            <JapanExploreCard
              key={place.id}
              place={place}
              expanded={expandedId === place.id}
              setExpanded={(expanded) => setExpandedId(expanded ? place.id : null)}
              selectedDay={targetDayById[place.id] || 1}
              setSelectedDay={(day) => setTargetDayById((current) => ({ ...current, [place.id]: day }))}
              days={days}
              addPlaceToItinerary={addPlaceToItinerary}
              copyQuery={copyQuery}
              brokenImageIds={brokenImageIds}
              setBrokenImageIds={setBrokenImageIds}
              loadedImageIds={loadedImageIds}
              setLoadedImageIds={setLoadedImageIds}
              exchangeRate={exchangeRate}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No Japan ideas match" body="Clear a filter or search something broader like food, rainy day, Kyoto, or Tokyo." />
      )}
    </section>
  );
}

function JapanExploreCard({
  place,
  expanded,
  setExpanded,
  selectedDay,
  setSelectedDay,
  days,
  addPlaceToItinerary,
  copyQuery,
  brokenImageIds,
  setBrokenImageIds,
  loadedImageIds,
  setLoadedImageIds,
  exchangeRate,
}: {
  place: JapanExplorePlace;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  days: number[];
  addPlaceToItinerary: (place: JapanExplorePlace, day: number) => void;
  copyQuery: (place: JapanExplorePlace) => Promise<void>;
  brokenImageIds: Set<string>;
  setBrokenImageIds: Dispatch<SetStateAction<Set<string>>>;
  loadedImageIds: Set<string>;
  setLoadedImageIds: Dispatch<SetStateAction<Set<string>>>;
  exchangeRate: number;
}) {
  const imageKey = `japan-explore-${place.id}`;
  const hasImage = isImageUrl(place.imageUrl) && !brokenImageIds.has(imageKey);
  const imageLoaded = loadedImageIds.has(imageKey);
  return (
    <article className={`japan-idea-card ${hasImage ? "has-real-image" : "no-real-image"} ${expanded ? "is-expanded" : ""}`}>
      <button className="japan-idea-preview" type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        {hasImage && (
          <div className={`japan-idea-image ${!imageLoaded ? "is-loading" : ""}`}>
            <span className="image-skeleton" aria-hidden="true" />
            <img
              src={place.imageUrl}
              alt={place.imageAlt}
              loading="lazy"
              decoding="async"
              className={imageLoaded ? "loaded" : ""}
              onLoad={() => setLoadedImageIds((current) => new Set(current).add(imageKey))}
              onError={() => setBrokenImageIds((current) => new Set(current).add(imageKey))}
            />
          </div>
        )}
        <div className="japan-idea-title">
          <span>{place.city} · {place.kind}</span>
          <h3>{place.title}</h3>
        </div>
      </button>
      <div className="japan-idea-body">
        <p>{place.description}</p>
        <div className="mini-tags">
          {place.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <div className="meta-chips">
          <span className="cost-chip">
            <CircleDollarSign size={14} />
            <b>{formatCadOnly(place.estimatedCostJpy, exchangeRate)}</b>
            <small>{formatLocalOnly(place.estimatedCostJpy, "JPY")}</small>
          </span>
          <span><MapPin size={14} /> {place.neighborhood}</span>
        </div>
        {expanded && (
          <div className="japan-idea-details">
            <p><strong>Why go:</strong> {place.whyGo}</p>
            <p><strong>Maps:</strong> {place.googleMapsQuery}</p>
            <p><strong>Photo:</strong> {place.photoStatus === "wikimedia" ? "Wikimedia Commons" : "Compact fallback until a safe place photo is added."}</p>
            {place.imageCredit && (
              <p>
                <strong>Image credit:</strong>{" "}
                {place.imageCreditUrl ? <a href={place.imageCreditUrl} target="_blank" rel="noreferrer">{place.imageCredit}</a> : place.imageCredit}
                {place.imageLicense ? `, ${place.imageLicense}` : ""}
              </p>
            )}
            <div className="japan-idea-actions">
              <label className="field">
                <span>Add to day</span>
                <select value={selectedDay} onChange={(event) => setSelectedDay(Number(event.target.value))}>
                  {days.map((day) => <option key={day} value={day}>Day {day}</option>)}
                </select>
              </label>
              <button className="primary-button" type="button" onClick={() => addPlaceToItinerary(place, selectedDay)}>
                <Plus size={16} aria-hidden="true" /> Add
              </button>
              <button className="ghost-button" type="button" onClick={() => copyQuery(place)}>
                <Clipboard size={16} aria-hidden="true" /> Copy
              </button>
              <a className="ghost-link-button" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.googleMapsQuery)}`} target="_blank" rel="noreferrer">
                <MapIcon size={16} aria-hidden="true" /> Map
              </a>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function DiscoveryBoard({
  places,
  brokenImageIds,
  setBrokenImageIds,
  loadedImageIds,
  setLoadedImageIds,
  setSaveStatus,
}: {
  places: DiscoveryPlace[];
  brokenImageIds: Set<string>;
  setBrokenImageIds: Dispatch<SetStateAction<Set<string>>>;
  loadedImageIds: Set<string>;
  setLoadedImageIds: Dispatch<SetStateAction<Set<string>>>;
  setSaveStatus: (status: string) => void;
}) {
  const [windowFilter, setWindowFilter] = useState<"All" | DiscoveryWindow>("All");
  const [kindFilter, setKindFilter] = useState<"All" | DiscoveryKind>("All");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const countries = useMemo(() => ["All", ...Array.from(new Set(places.map((place) => place.country))).sort()], [places]);
  const [countryFilter, setCountryFilter] = useState("All");

  const filteredPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((place) => {
      const windowMatch = windowFilter === "All" || place.bestWindow === windowFilter || place.bestWindow === "Both windows";
      const kindMatch = kindFilter === "All" || place.kind === kindFilter;
      const countryMatch = countryFilter === "All" || place.country === countryFilter;
      const queryMatch =
        !q ||
        [place.title, place.country, place.region, place.bestWindow, place.kind, place.summary, place.whyGo, ...place.tags]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return windowMatch && kindMatch && countryMatch && queryMatch;
    });
  }, [countryFilter, kindFilter, places, query, windowFilter]);

  const photoCount = filteredPlaces.filter((place) => isImageUrl(place.imageUrl) && !brokenImageIds.has(`discovery-${place.id}`)).length;

  async function copyQuery(place: DiscoveryPlace) {
    await copyText(place.googleMapsQuery);
    setSaveStatus(`Copied ${place.title} map query`);
  }

  return (
    <section className="discovery-board content-section">
      <div className="discovery-hero">
        <div>
          <p className="eyebrow">Open travel windows</p>
          <h2>Ideas for Jun 6-24 or Sep 1-12.</h2>
          <p>Shortlist trips that fit your free windows. These are research ideas, not booked plans.</p>
        </div>
        <div className="discovery-window-cards" aria-label="Travel windows">
          <button type="button" className={windowFilter === "June 6-24" ? "active" : ""} onClick={() => setWindowFilter("June 6-24")}>
            <span>June</span>
            <strong>6-24</strong>
            <small>longer nature trips</small>
          </button>
          <button type="button" className={windowFilter === "Sep 1-12" ? "active" : ""} onClick={() => setWindowFilter("Sep 1-12")}>
            <span>September</span>
            <strong>1-12</strong>
            <small>shoulder-season Europe</small>
          </button>
        </div>
      </div>

      <div className="japan-explore-toolbar discovery-toolbar">
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search islands, hiking, food, road trips" />
        </label>
        <div className="chip-scroll" aria-label="Travel window filters">
          {discoveryWindows.map((option) => (
            <button key={option} type="button" className={windowFilter === option ? "chip active" : "chip"} onClick={() => setWindowFilter(option)}>
              {option}
            </button>
          ))}
        </div>
        <div className="chip-scroll" aria-label="Discovery type filters">
          {discoveryKinds.map((option) => (
            <button key={option} type="button" className={kindFilter === option ? "chip active" : "chip"} onClick={() => setKindFilter(option)}>
              {option}
            </button>
          ))}
        </div>
        <div className="chip-scroll" aria-label="Country filters">
          {countries.map((option) => (
            <button key={option} type="button" className={countryFilter === option ? "chip active" : "chip"} onClick={() => setCountryFilter(option)}>
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="discovery-summary-row">
        <span><Sparkles size={16} aria-hidden="true" /> {filteredPlaces.length} ideas</span>
        <span><MapIcon size={16} aria-hidden="true" /> {photoCount} photo cards</span>
        <span><Plane size={16} aria-hidden="true" /> Budget ranges are rough CAD</span>
      </div>

      {filteredPlaces.length ? (
        <div className="discovery-grid">
          {filteredPlaces.map((place) => (
            <DiscoveryCard
              key={place.id}
              place={place}
              expanded={expandedId === place.id}
              setExpanded={(expanded) => setExpandedId(expanded ? place.id : null)}
              copyQuery={copyQuery}
              brokenImageIds={brokenImageIds}
              setBrokenImageIds={setBrokenImageIds}
              loadedImageIds={loadedImageIds}
              setLoadedImageIds={setLoadedImageIds}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No discovery ideas match" body="Clear a filter or search something broad like island, hiking, food, or coast." />
      )}
    </section>
  );
}

function DiscoveryCard({
  place,
  expanded,
  setExpanded,
  copyQuery,
  brokenImageIds,
  setBrokenImageIds,
  loadedImageIds,
  setLoadedImageIds,
}: {
  place: DiscoveryPlace;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  copyQuery: (place: DiscoveryPlace) => Promise<void>;
  brokenImageIds: Set<string>;
  setBrokenImageIds: Dispatch<SetStateAction<Set<string>>>;
  loadedImageIds: Set<string>;
  setLoadedImageIds: Dispatch<SetStateAction<Set<string>>>;
}) {
  const imageKey = `discovery-${place.id}`;
  const hasImage = isImageUrl(place.imageUrl) && !brokenImageIds.has(imageKey);
  const imageLoaded = loadedImageIds.has(imageKey);

  return (
    <article className={`discovery-card ${hasImage ? "has-real-image" : "no-real-image"} ${expanded ? "is-expanded" : ""}`}>
      <button className="discovery-preview" type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        {hasImage && (
          <div className={`discovery-image ${!imageLoaded ? "is-loading" : ""}`}>
            <span className="image-skeleton" aria-hidden="true" />
            <img
              src={place.imageUrl}
              alt={place.imageAlt}
              loading="lazy"
              decoding="async"
              className={imageLoaded ? "loaded" : ""}
              onLoad={() => setLoadedImageIds((current) => new Set(current).add(imageKey))}
              onError={() => setBrokenImageIds((current) => new Set(current).add(imageKey))}
            />
          </div>
        )}
        <div className="discovery-title">
          <span>{place.bestWindow} · {place.kind}</span>
          <h3>{place.title}</h3>
          <small>{place.region}</small>
        </div>
      </button>
      <div className="discovery-body">
        <p>{place.summary}</p>
        <div className="mini-tags">
          {place.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <div className="meta-chips">
          <span><CalendarDays size={14} /> {place.idealLength}</span>
          <span><CircleDollarSign size={14} /> {place.estimatedBudgetCad}</span>
          <span><MapPin size={14} /> {place.country}</span>
        </div>
        {expanded && (
          <div className="discovery-details">
            <p><strong>Why go:</strong> {place.whyGo}</p>
            <p><strong>Flight note:</strong> {place.flightNote}</p>
            <p><strong>Maps:</strong> {place.googleMapsQuery}</p>
            {place.imageCredit && (
              <p>
                <strong>Image:</strong>{" "}
                {place.imageCreditUrl ? <a href={place.imageCreditUrl} target="_blank" rel="noreferrer">{place.imageCredit}</a> : place.imageCredit}
                {place.imageLicense ? `, ${place.imageLicense}` : ""}
              </p>
            )}
            <div className="discovery-actions">
              <button className="ghost-button" type="button" onClick={() => copyQuery(place)}>
                <Clipboard size={16} aria-hidden="true" /> Copy query
              </button>
              <a className="ghost-link-button" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.googleMapsQuery)}`} target="_blank" rel="noreferrer">
                <MapIcon size={16} aria-hidden="true" /> Open map
              </a>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function ActivityCard({
  activity,
  variant = "full",
  stopNumber,
  expandedId,
  setExpandedId,
  updateActivity,
  deleteActivity,
  brokenImageIds,
  setBrokenImageIds,
  loadedImageIds,
  setLoadedImageIds,
  trip,
  exchangeRate,
}: {
  activity: TripActivity;
  variant?: "full" | "compact";
  stopNumber?: number;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  updateActivity: (id: string, patch: Partial<TripActivity>) => void;
  deleteActivity: (id: string) => void;
  brokenImageIds: Set<string>;
  setBrokenImageIds: Dispatch<SetStateAction<Set<string>>>;
  loadedImageIds: Set<string>;
  setLoadedImageIds: Dispatch<SetStateAction<Set<string>>>;
  trip: Trip;
  exchangeRate: number;
}) {
  const expanded = expandedId === activity.id;
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: activity.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const hasImage = isImageUrl(activity.imageUrl) && !brokenImageIds.has(activity.id);
  const imageLoaded = loadedImageIds.has(activity.id);
  const needsConfirmation = Boolean(activity.needsConfirmationReasons?.length || activity.costStatus === "needs-confirmation" || activity.bookingStatus === "needs-confirmation");
  const localCostSubtext = getLocalCostSubtext(activity.costLocal ?? activity.estimatedCost, activity.localCurrencyCode || activity.currency);
  return (
    <article className={`place-card ${variant === "compact" ? "itinerary-card" : ""} ${hasImage ? "has-real-image" : "no-real-image"} type-${activity.type || "activity"}${activity.isCompleted ? " completed" : ""}`} ref={setNodeRef} style={style}>
      {stopNumber && <span className="pin-badge" aria-label={`Stop ${stopNumber}`}>{stopNumber}</span>}
      <div className={`card-image ${hasImage ? "has-photo" : "fallback-visual"} ${hasImage && !imageLoaded ? "is-loading" : ""}`} style={{ background: hasImage ? undefined : activity.imageUrl || placeholderFor(activity.title) }}>
        {hasImage ? (
          <>
            <span className="image-skeleton" aria-hidden="true" />
            <img
              src={activity.imageUrl}
              alt={activity.imageAlt || activity.title}
              loading="lazy"
              decoding="async"
              className={imageLoaded ? "loaded" : ""}
              onLoad={() => setLoadedImageIds((current) => new Set(current).add(activity.id))}
              onError={() => setBrokenImageIds((current) => new Set(current).add(activity.id))}
            />
          </>
        ) : (
          <div className="fallback-visual-content" aria-hidden="true">
            <span>{visualKicker(activity)}</span>
            <strong>{placeInitials(activity.title)}</strong>
            <small>{activity.type || activity.category}</small>
          </div>
        )}
        <button className="drag-handle" type="button" {...listeners} {...attributes} aria-label={`Drag ${activity.title}`}>
          <GripVertical size={16} aria-hidden="true" />
        </button>
        <span className="category-badge">{activity.category}</span>
      </div>
      <div className="card-body">
        <div className="card-title-row">
          <div>
            <p className="eyebrow">{activity.city}{activity.date ? ` | ${formatDate(activity.date)}` : ""}</p>
            <h3>{activity.title}</h3>
          </div>
          <div className="card-icon-actions">
            <button className="icon-button bookmark-button" type="button" onClick={() => updateActivity(activity.id, { isBooked: !activity.isBooked })} title={activity.isBooked ? "Remove booked marker" : "Mark as saved/booked"}>
              <Bookmark size={16} aria-hidden="true" />
            </button>
            <button className="icon-button" type="button" onClick={() => setExpandedId(expanded ? null : activity.id)} aria-expanded={expanded} title="Expand and edit">
              <ChevronDown size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
        <p>{activity.description}</p>
        {activity.address && <p className="address-line"><MapPin size={14} aria-hidden="true" /> {activity.address}</p>}
        <div className="meta-chips">
          <span className="cost-chip">
            <CircleDollarSign size={14} />
            <b>{getCostLabel(activity, exchangeRate)}</b>
            {localCostSubtext && <small>{localCostSubtext}</small>}
          </span>
          <span><MapPin size={14} /> {routeTimeLabel(activity) || "Add travel time"}</span>
          <span><BadgeCheck size={14} /> {activityStatusLabel(activity)}</span>
          {variant === "full" && <span><Sparkles size={14} /> Priority {activity.priority}</span>}
        </div>
        <div className="place-card-actions">
          <a className="ghost-link-button" href={googleMapUrl(activity)} target="_blank" rel="noreferrer">
            <MapIcon size={16} aria-hidden="true" /> Open Map
          </a>
        </div>
        {expanded && (
          <div className="expanded-panel">
            <div className="edit-grid">
              <label className="field"><span>Title</span><input value={activity.title} onChange={(event) => updateActivity(activity.id, { title: event.target.value })} /></label>
              <label className="field"><span>City</span><input value={activity.city} onChange={(event) => updateActivity(activity.id, { city: event.target.value })} /></label>
              <label className="field"><span>Day</span><input type="number" min="1" value={activity.day} onChange={(event) => updateActivity(activity.id, { day: Math.max(1, Number(event.target.value)) })} /></label>
              <label className="field"><span>Category</span><select value={activity.category} onChange={(event) => updateActivity(activity.id, { category: event.target.value as TripCategory })}>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="field"><span>Cost ({activity.localCurrencyCode || activity.currency})</span><input type="number" min="0" value={activity.costLocal ?? activity.estimatedCost} onChange={(event) => updateActivity(activity.id, { estimatedCost: Number(event.target.value) })} /></label>
              <label className="field"><span>Duration</span><input value={activity.duration} onChange={(event) => updateActivity(activity.id, { duration: event.target.value })} /></label>
              <label className="field"><span>Travel time</span><input value={activity.travelTimeFromPrevious || ""} onChange={(event) => updateActivity(activity.id, { travelTimeFromPrevious: event.target.value })} /></label>
              <label className="field"><span>Image URL</span><input value={activity.imageUrl} onChange={(event) => updateActivity(activity.id, { imageUrl: event.target.value })} /></label>
            </div>
            <label className="field"><span>Notes</span><textarea value={activity.notes} onChange={(event) => updateActivity(activity.id, { notes: event.target.value })} placeholder="No notes yet" /></label>
            <div className="expanded-actions">
              <label className="toggle"><input type="checkbox" checked={activity.isBooked} onChange={(event) => updateActivity(activity.id, { isBooked: event.target.checked })} /> Booked</label>
              <label className="toggle"><input type="checkbox" checked={activity.isCompleted} onChange={(event) => updateActivity(activity.id, { isCompleted: event.target.checked })} /> Completed</label>
              <button className="danger-button" type="button" onClick={() => deleteActivity(activity.id)}><Trash2 size={16} /> Delete</button>
            </div>
            <div className="detail-list">
              <p><strong>Maps:</strong> {activity.googleMapsQuery}</p>
              {activity.address && <p><strong>Address:</strong> {activity.address}</p>}
              <p><strong>Booking:</strong> {activity.bookingReference || activity.confirmationReference || "No booking reference yet."}</p>
              <p><strong>Cost status:</strong> {activity.costStatus || "rough estimate"}{activity.costCad ? `, CAD ${activity.costCad.toLocaleString("en-CA")}` : ""}</p>
              <p><strong>Route:</strong> {activity.routeLegEstimate || activity.travelTimeFromPrevious || "Travel time missing"}{activity.isRouteEstimate ? " (estimate)" : ""}</p>
              <p><strong>Source:</strong> {activity.source || "manual"}{activity.sourceId ? `, ${activity.sourceId}` : ""}</p>
              {needsConfirmation && <p><strong>Needs confirmation:</strong> {(activity.needsConfirmationReasons || ["Cost, timing, or booking details need confirmation."]).join("; ")}</p>}
              <p><strong>Attachments:</strong> {activity.attachmentIds.length ? activity.attachmentIds.join(", ") : "No attachments linked."}</p>
              {activity.imageAlt && <p><strong>Image:</strong> {activity.imageAlt}</p>}
              {activity.imageCredit && (
                <p>
                  <strong>Image credit:</strong>{" "}
                  {activity.imageCreditUrl ? <a href={activity.imageCreditUrl} target="_blank" rel="noreferrer">{activity.imageCredit}</a> : activity.imageCredit}
                  {activity.imageLicense ? `, ${activity.imageLicense}` : ""}
                </p>
              )}
            </div>
            {trip.id === "japan-2026" && japanCategories.includes(activity.category as Category) && (
              <p className="quiet-note">Japan activity keeps original planner fields where possible, with JPY as source and CAD as comparison.</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

interface ActivityListProps {
  activities: TripActivity[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  updateActivity: (id: string, patch: Partial<TripActivity>) => void;
  deleteActivity: (id: string) => void;
  brokenImageIds: Set<string>;
  setBrokenImageIds: Dispatch<SetStateAction<Set<string>>>;
  loadedImageIds: Set<string>;
  setLoadedImageIds: Dispatch<SetStateAction<Set<string>>>;
  trip: Trip;
  exchangeRate: number;
}

function pinKind(activity: TripActivity) {
  if (activity.type === "hotel" || activity.category === "Hotel") return "hotel";
  if (activity.type === "food" || activity.category === "Food") return "food";
  if (activity.type === "flight" || activity.type === "transport" || activity.category === "Flight" || activity.category === "Transit") return "transit";
  return "attraction";
}

function getCoordinateBounds(stops: TripActivity[]) {
  return stops.reduce(
    (acc, activity) => ({
      minLat: Math.min(acc.minLat, activity.latitude!),
      maxLat: Math.max(acc.maxLat, activity.latitude!),
      minLng: Math.min(acc.minLng, activity.longitude!),
      maxLng: Math.max(acc.maxLng, activity.longitude!),
    }),
    { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 },
  );
}

function mapViewportBounds(trip: Trip, stops: TripActivity[], overviewMode = false) {
  const bounds = getCoordinateBounds(stops);
  if (overviewMode && trip.id === "portugal-2026") {
    return {
      minLat: Math.min(28, bounds.minLat),
      maxLat: Math.max(66, bounds.maxLat),
      minLng: Math.min(-42, bounds.minLng),
      maxLng: Math.max(40, bounds.maxLng),
    };
  }
  if (overviewMode && trip.id === "peru-2026") {
    return {
      minLat: Math.min(-24, bounds.minLat),
      maxLat: Math.max(12, bounds.maxLat),
      minLng: Math.min(-96, bounds.minLng),
      maxLng: Math.max(-54, bounds.maxLng),
    };
  }
  return bounds;
}

function makeTileMap(trip: Trip, stops: TripActivity[], overviewMode = false) {
  const bounds = mapViewportBounds(trip, stops, overviewMode);
  const zoom = getMapZoom(bounds);
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const centerTileX = longitudeToTileX(centerLng, zoom);
  const centerTileY = latitudeToTileY(centerLat, zoom);
  const tileColumns = overviewMode ? 6 : 5;
  const tileRows = overviewMode ? 5 : 4;
  const startTileX = Math.floor(centerTileX - tileColumns / 2);
  const startTileY = Math.floor(centerTileY - tileRows / 2);
  const maxTile = 2 ** zoom;
  const mapTiles = Array.from({ length: tileColumns * tileRows }, (_, index) => {
    const col = index % tileColumns;
    const row = Math.floor(index / tileColumns);
    const tileX = startTileX + col;
    const tileY = clamp(startTileY + row, 0, maxTile - 1);
    const wrappedX = ((tileX % maxTile) + maxTile) % maxTile;
    return {
      key: `${zoom}-${tileX}-${tileY}`,
      url: `https://a.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${wrappedX}/${tileY}@2x.png`,
      left: `${(col / tileColumns) * 100}%`,
      top: `${(row / tileRows) * 100}%`,
      width: `${100 / tileColumns}%`,
      height: `${100 / tileRows}%`,
    };
  });
  const pins = stops.map((activity, index) => {
    const projectedX = longitudeToTileX(activity.longitude!, zoom);
    const projectedY = latitudeToTileY(activity.latitude!, zoom);
    return {
      activity,
      index,
      x: Math.max(7, Math.min(93, ((projectedX - startTileX) / tileColumns) * 100)),
      y: Math.max(7, Math.min(91, ((projectedY - startTileY) / tileRows) * 100)),
      kind: pinKind(activity),
    };
  });
  return { mapTiles, pins };
}

function MapTileCanvas({ trip, stops, overviewMode = false, className = "" }: { trip: Trip; stops: TripActivity[]; overviewMode?: boolean; className?: string }) {
  const { mapTiles, pins } = makeTileMap(trip, stops, overviewMode);
  return (
    <div className={`map-canvas ${className}`.trim()}>
      <div className="map-tiles" aria-hidden="true">
        {mapTiles.map((tile) => (
          <img key={tile.key} src={tile.url} alt="" loading="lazy" style={{ left: tile.left, top: tile.top, width: tile.width, height: tile.height }} />
        ))}
      </div>
      {pins.map((pin) => (
        <a
          key={pin.activity.id}
          className={`map-pin pin-${pin.kind}`}
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          title={pin.activity.title}
          href={googleMapUrl(pin.activity)}
          target="_blank"
          rel="noreferrer"
        >
          {pin.index + 1}
        </a>
      ))}
    </div>
  );
}

function isLongDistanceTransitDay(trip: Trip, activities: TripActivity[], selectedDay: number | "All") {
  if (!bookedTripIds.has(trip.id)) return false;
  const countries = new Set(activities.map((activity) => activity.country).filter(Boolean));
  const transitStops = activities.filter((activity) => activity.type === "flight" || activity.type === "transport" || activity.category === "Flight" || activity.category === "Transit");
  const coordinates = activities.filter((activity) => activity.latitude !== undefined && activity.longitude !== undefined);
  if (countries.size > 1 || transitStops.length >= 2) return true;
  if (coordinates.length < 2) return false;
  const latitudes = coordinates.map((activity) => activity.latitude!);
  const longitudes = coordinates.map((activity) => activity.longitude!);
  return Math.max(...latitudes) - Math.min(...latitudes) > 3 || Math.max(...longitudes) - Math.min(...longitudes) > 3;
}

function TripMapPanel({
  trip,
  activities,
  selectedDay,
  onAddPlace,
}: {
  trip: Trip;
  activities: TripActivity[];
  selectedDay: number | "All";
  onAddPlace: (place: OpenPlaceSearchResult, day: number) => void;
}) {
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState<OpenPlaceSearchResult[]>([]);
  const [mapSearchStatus, setMapSearchStatus] = useState("");
  const stops = activities
    .filter((activity) => activity.latitude !== undefined || activity.googleMapsQuery || activity.address)
    .slice(0, 14);
  const dayLabel = selectedDay === "All" ? "All Visible Days" : `Day ${selectedDay}`;

  if (isLongDistanceTransitDay(trip, stops, selectedDay)) {
    return <TransitRoutePanel trip={trip} stops={stops} selectedDay={selectedDay} dayLabel={dayLabel} />;
  }

  const coordinateStops = stops.filter((activity) => activity.latitude !== undefined && activity.longitude !== undefined);
  const hasCoordinates = coordinateStops.length > 0;
  const targetDay = selectedDay === "All" ? stops[0]?.day || 1 : selectedDay;
  const searchBias = coordinateStops.length
    ? {
        latitude: coordinateStops.reduce((sum, activity) => sum + activity.latitude!, 0) / coordinateStops.length,
        longitude: coordinateStops.reduce((sum, activity) => sum + activity.longitude!, 0) / coordinateStops.length,
      }
    : undefined;

  async function runMapSearch(event?: FormEvent) {
    event?.preventDefault();
    const query = mapSearchQuery.trim();
    if (query.length < 3) {
      setMapSearchStatus("Type at least 3 characters.");
      setMapSearchResults([]);
      return;
    }
    setMapSearchStatus("Searching open map data...");
    const results = await searchOpenPlaces(query, searchBias);
    setMapSearchResults(results);
    setMapSearchStatus(results.length ? `${results.length} open map results` : "No places found. Try adding a city or country.");
  }

  return (
    <aside className="map-panel" aria-label={`${trip.title} map preview`}>
      <div className="map-panel-header">
        <div>
          <p className="eyebrow">Open map</p>
          <h2>{dayLabel}</h2>
        </div>
        <span>{stops.length} pins</span>
      </div>
      <form className="map-search" onSubmit={runMapSearch}>
        <label>
          <Search size={16} aria-hidden="true" />
          <input
            value={mapSearchQuery}
            onChange={(event) => setMapSearchQuery(event.target.value)}
            placeholder={`Search places near ${trip.country}`}
          />
        </label>
        <button type="submit">Search</button>
      </form>
      {(mapSearchStatus || mapSearchResults.length > 0) && (
        <div className="map-search-results" aria-live="polite">
          {mapSearchStatus && <p>{mapSearchStatus}</p>}
          {mapSearchResults.slice(0, 5).map((result) => (
            <article key={`${result.latitude}-${result.longitude}-${result.name}`}>
              <div>
                <strong>{result.name}</strong>
                <span>{[result.city, result.country].filter(Boolean).join(", ") || result.address}</span>
              </div>
              <button type="button" onClick={() => onAddPlace(result, targetDay)}>
                Add to Day {targetDay}
              </button>
            </article>
          ))}
        </div>
      )}
      {hasCoordinates ? (
        <LeafletActivityMap
          trip={trip}
          stops={coordinateStops}
          className="map-canvas leaflet-itinerary-map"
          ariaLabel={`${dayLabel} interactive itinerary map`}
        />
      ) : (
        <div className="map-canvas map-canvas-empty">
          <MapPin size={22} aria-hidden="true" />
          <span>Add coordinates to show this day on the map.</span>
        </div>
      )}
      <div className="map-legend" aria-label="Map pin legend">
        <span><i className="legend-dot attraction" /> attractions</span>
        <span><i className="legend-dot hotel" /> hotels</span>
        <span><i className="legend-dot food" /> food</span>
        <span><i className="legend-dot transit" /> flights/transit</span>
      </div>
      <div className="map-route-list">
        {stops.slice(0, 6).map((activity, index) => (
          <div key={activity.id}>
            <strong>{index + 1}. {activity.title}</strong>
            <span>{activity.city} · {routeTimeLabel(activity) || "travel time TBD"}</span>
          </div>
        ))}
      </div>
      <p className="quiet-note">OpenStreetMap tiles with saved coordinates and stop order. Route timing uses imported notes or local estimates; no Google Maps API is loaded.</p>
    </aside>
  );
}

function TripDayMapStack({ trip, activities }: { trip: Trip; activities: TripActivity[] }) {
  const dayGroups = activities.reduce<Record<number, TripActivity[]>>((acc, activity) => {
    if (
      activity.country !== trip.country ||
      activity.latitude === undefined ||
      activity.longitude === undefined ||
      activity.type === "flight" ||
      activity.type === "transport" ||
      activity.category === "Flight" ||
      activity.category === "Transit"
    ) {
      return acc;
    }
    acc[activity.day] ||= [];
    acc[activity.day].push(activity);
    return acc;
  }, {});
  const mappedDays = Object.entries(dayGroups)
    .map(([day, stops]) => ({ day: Number(day), stops: stops.slice(0, 8) }))
    .filter(({ stops }) => stops.length >= 2)
    .sort((a, b) => a.day - b.day);

  if (!mappedDays.length) {
    return <TripMapPanel trip={trip} activities={activities} selectedDay="All" onAddPlace={(_place, _day) => undefined} />;
  }

  return (
    <aside className="map-panel day-map-stack" aria-label={`${trip.title} day maps`}>
      <div className="map-panel-header">
        <div>
          <p className="eyebrow">Open map</p>
          <h2>Daily Map Views</h2>
        </div>
        <span>{mappedDays.length} days</span>
      </div>
      <div className="day-map-list">
        {mappedDays.map(({ day, stops }) => (
          <article className="day-map-card" key={day}>
            <div className="places-day-heading">
              <div>
                <p className="eyebrow">Day {day}</p>
                <h3>{stops[0]?.city || trip.country}</h3>
              </div>
              <span>{stops.length} pins</span>
            </div>
            <LazyLeafletActivityMap
              trip={trip}
              stops={stops}
              className="map-canvas day-map-canvas leaflet-itinerary-map"
              ariaLabel={`Day ${day} interactive map`}
            />
            <div className="map-route-list compact-map-route-list">
              {stops.slice(0, 4).map((activity, index) => (
                <a key={activity.id} href={googleMapUrl(activity)} target="_blank" rel="noreferrer">
                  <strong>{index + 1}. {activity.title}</strong>
                  <span>{activity.city} · {routeTimeLabel(activity) || "travel time TBD"}</span>
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
      <p className="quiet-note">Each daily map shows local sightseeing pins only. Flight and long transfer days stay out of these views.</p>
    </aside>
  );
}

function TransitRoutePanel({ trip, stops, selectedDay, dayLabel }: { trip: Trip; stops: TripActivity[]; selectedDay: number | "All"; dayLabel: string }) {
  const routeSummary = typeof selectedDay === "number" ? tripDayRouteSummary(trip, selectedDay) : "";
  return (
    <aside className="map-panel transit-panel" aria-label={`${trip.title} transit route`}>
      <div className="map-panel-header">
        <div>
          <p className="eyebrow">Transit day</p>
          <h2>{dayLabel}</h2>
        </div>
        <span>{stops.length} stops</span>
      </div>
      {routeSummary && <p className="transit-summary">{routeSummary}</p>}
      <div className="transit-route-list">
        {stops.map((activity, index) => (
          <article key={activity.id} className={`transit-step step-${pinKind(activity)}`}>
            <span className="transit-number">{index + 1}</span>
            <div>
              <strong>{activity.title}</strong>
              <small>{activity.city}{activity.country ? `, ${activity.country}` : ""}</small>
              <p>{index === 0 ? "Start of day" : routeTimeLabel(activity) || "Travel time TBD"}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="quiet-note">{selectedDay === "All" ? "The full trip crosses countries and regions, so this summary is safer than drawing one misleading street route." : "This day crosses countries or regions, so a street map would be misleading. Local sightseeing days still show the map."}</p>
    </aside>
  );
}

function PlaceBrowser(props: ActivityListProps) {
  const grouped = props.activities.reduce<Record<number, TripActivity[]>>((acc, activity) => {
    acc[activity.day] ||= [];
    acc[activity.day].push(activity);
    return acc;
  }, {});
  const days = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Explore by day</p>
          <h2>{props.activities.length} visible places</h2>
        </div>
        <MapIcon size={22} aria-hidden="true" />
      </div>
      {props.activities.length ? (
        <div className="places-by-day">
          {days.map((day) => (
            <section className="places-day-group" key={day}>
              <div className="places-day-heading">
                <div>
                  <p className="eyebrow">Day {day}</p>
                  <h3>{grouped[day][0]?.city || props.trip.country}</h3>
                </div>
                <span>{grouped[day].length} places</span>
              </div>
              <div className="activity-grid browser-grid preview-grid">
                {grouped[day].map((activity) => <PlacePreviewCard key={activity.id} activity={activity} {...props} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="No matching places" body="Clear a filter or add a custom activity for this trip." />
      )}
    </section>
  );
}

function PlacePreviewCard({
  activity,
  expandedId,
  setExpandedId,
  brokenImageIds,
  setBrokenImageIds,
  loadedImageIds,
  setLoadedImageIds,
  exchangeRate,
}: ActivityListProps & { activity: TripActivity }) {
  const expanded = expandedId === activity.id;
  const hasImage = isImageUrl(activity.imageUrl) && !brokenImageIds.has(activity.id);
  const imageLoaded = loadedImageIds.has(activity.id);
  const localCostSubtext = getLocalCostSubtext(activity.costLocal ?? activity.estimatedCost, activity.localCurrencyCode || activity.currency);
  return (
    <article className={`place-preview-card ${hasImage ? "has-real-image" : "no-real-image"} ${expanded ? "is-expanded" : ""}`}>
      <button className="place-preview-button" type="button" onClick={() => setExpandedId(expanded ? null : activity.id)} aria-expanded={expanded}>
        {hasImage && (
          <div className={`preview-image ${!imageLoaded ? "is-loading" : ""}`}>
            <span className="image-skeleton" aria-hidden="true" />
            <img
              src={activity.imageUrl}
              alt={activity.imageAlt || activity.title}
              loading="lazy"
              decoding="async"
              className={imageLoaded ? "loaded" : ""}
              onLoad={() => setLoadedImageIds((current) => new Set(current).add(activity.id))}
              onError={() => setBrokenImageIds((current) => new Set(current).add(activity.id))}
            />
          </div>
        )}
        <div className="preview-title">
          <span>{activity.city} · Day {activity.day}</span>
          <h3>{activity.title}</h3>
        </div>
        <div className="preview-reveal">
          <p>{activity.description}</p>
          <div className="meta-chips">
            <span><CircleDollarSign size={14} /> {getCostLabel(activity, exchangeRate)}</span>
            <span><MapPin size={14} /> {routeTimeLabel(activity) || "Add travel time"}</span>
          </div>
          {localCostSubtext && <small>{localCostSubtext}</small>}
        </div>
      </button>
      <a className="place-preview-map-link" href={googleMapUrl(activity)} target="_blank" rel="noreferrer">
        <MapIcon size={15} aria-hidden="true" /> Open Map
      </a>
    </article>
  );
}

function BudgetDashboard({ trip, activities, budget, updateActivity, exchangeRate }: { trip: Trip; activities: TripActivity[]; budget: ReturnType<typeof makeBudget>; updateActivity: (id: string, patch: Partial<TripActivity>) => void; exchangeRate: number }) {
  const categoryRows = Object.entries(budget.categories);
  const dayRows = activities.reduce<Record<string, BudgetRange>>((acc, activity) => {
    const key = `Day ${activity.day}`;
    acc[key] = sumRanges([acc[key] || { low: 0, mid: 0, high: 0 }, activityRange(activity)]);
    return acc;
  }, {});
  const [budgetQuery, setBudgetQuery] = useState("");
  const [budgetView, setBudgetView] = useState<"all" | "missing" | "flight" | "hotel" | "activity" | "food" | "transport" | "day" | "city">("all");
  const normalizedQuery = budgetQuery.trim().toLowerCase();
  const budgetActivities = activities.filter((activity) => {
    const queryMatch = !normalizedQuery || [activity.title, activity.city, activity.category, activity.notes].join(" ").toLowerCase().includes(normalizedQuery);
    const missingMatch = budgetView !== "missing" || !activity.costLocal;
    const categoryMatch =
      !["flight", "hotel", "activity", "food", "transport"].includes(budgetView) ||
      activity.costCategory === budgetView ||
      activity.type === budgetView ||
      (budgetView === "transport" && (activity.category === "Transit" || activity.category === "Flight"));
    return queryMatch && missingMatch && categoryMatch;
  });
  const groupedBudget = budgetActivities.reduce<Record<string, TripActivity[]>>((acc, activity) => {
    const key = budgetView === "day" ? `Day ${activity.day}` : budgetView === "city" ? activity.city : "Editable costs";
    acc[key] ||= [];
    acc[key].push(activity);
    return acc;
  }, {});
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CAD-first rough estimates</p>
          <h2>Budget</h2>
        </div>
        <CircleDollarSign size={22} aria-hidden="true" />
      </div>
      <div className="budget-hero budget-hero-simple">
        <article className="metric-card total-metric">
          <p className="eyebrow">Total estimate</p>
          <strong>{formatCadOnly(budget.total.mid, exchangeRate)}</strong>
          <span>{getLocalCostSubtext(budget.total.mid, trip.currency)}</span>
        </article>
        <MetricCard label="Low" value={formatCadOnly(budget.total.low, exchangeRate)} detail={getLocalCostSubtext(budget.total.low, trip.currency)} icon={<CircleDollarSign size={18} />} />
        <MetricCard label="High" value={formatCadOnly(budget.total.high, exchangeRate)} detail={getLocalCostSubtext(budget.total.high, trip.currency)} icon={<CircleDollarSign size={18} />} />
      </div>
      <div className="budget-columns">
        <section>
          <h3>By category</h3>
          {categoryRows.map(([category, range]) => (
            <div className="budget-row" key={category}>
              <span>{category}</span>
              <strong>{formatCadOnly(range.mid, exchangeRate)}<small>{getLocalCostSubtext(range.mid, trip.currency)}</small></strong>
            </div>
          ))}
        </section>
        <section>
          <h3>By day</h3>
          {Object.entries(dayRows).slice(0, 12).map(([day, range]) => (
            <div className="budget-row" key={day}>
              <span>{day}</span>
              <strong>{formatCadOnly(range.mid, exchangeRate)}<small>{getLocalCostSubtext(range.mid, trip.currency)}</small></strong>
            </div>
          ))}
        </section>
      </div>
      <section className="inline-editor">
        <h3>Quick cost edits</h3>
        <div className="budget-controls">
          <label className="search-field">
            <Search size={17} aria-hidden="true" />
            <input value={budgetQuery} onChange={(event) => setBudgetQuery(event.target.value)} placeholder="Search costs by place, city, category" />
          </label>
          <select value={budgetView} onChange={(event) => setBudgetView(event.target.value as typeof budgetView)}>
            <option value="all">All editable costs</option>
            <option value="missing">Missing costs</option>
            <option value="flight">Flights</option>
            <option value="hotel">Hotels</option>
            <option value="activity">Activities</option>
            <option value="food">Food</option>
            <option value="transport">Transport</option>
            <option value="day">Group by day</option>
            <option value="city">Group by city</option>
          </select>
        </div>
        {Object.keys(groupedBudget).length ? Object.entries(groupedBudget).map(([group, groupActivities]) => (
          <div className="budget-edit-group" key={group}>
            <div className="places-day-heading">
              <h4>{group}</h4>
              <span>{groupActivities.length} items{groupActivities.length > 18 ? ", showing first 18" : ""}</span>
            </div>
            {groupActivities.slice(0, 18).map((activity) => {
              const localCost = activity.costLocal ?? activity.estimatedCost;
              const cadCost = Math.round(localCost / exchangeRate);
              return (
              <label className="budget-edit-row" key={activity.id}>
                <span>{activity.title}<small>{activity.city} · {activity.costCategory || activity.type || "activity"}</small></span>
                <input
                  type="number"
                  min="0"
                  aria-label={`${activity.title} CAD estimate`}
                  value={cadCost}
                  onChange={(event) => updateActivity(activity.id, { estimatedCost: Math.round(Number(event.target.value) * exchangeRate) })}
                />
                <small>CAD<br />{getLocalCostSubtext(localCost, activity.localCurrencyCode || activity.currency)}</small>
              </label>
              );
            })}
          </div>
        )) : <EmptyState title="No costs match" body="Clear the budget search or switch from missing costs to all costs." />}
      </section>
    </section>
  );
}

function LogisticsPanel({ trip, updateHotel, routeSuggestions, exchangeRate }: { trip: Trip; updateHotel: (id: string, patch: Partial<TripHotel>) => void; routeSuggestions: RouteSuggestion[]; exchangeRate: number }) {
  const transferSuggestions = routeSuggestions.filter((suggestion) => suggestion.severity === "warning").slice(0, 5);
  const transferActivities = trip.activities.filter((activity) => activity.type === "transport" || activity.type === "flight" || activity.category === "Transit" || activity.category === "Flight").slice(0, 8);
  return (
    <section className="content-section logistics-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Travel basics</p>
          <h2>Logistics</h2>
        </div>
        <Plane size={22} aria-hidden="true" />
      </div>
      <div className="logistics-grid">
        <section>
          <h3>Flights</h3>
          {trip.flights.length ? trip.flights.map((flight) => <FlightCard key={flight.id} flight={flight} exchangeRate={exchangeRate} tripCurrency={trip.currency} />) : <EmptyState title="No flights yet" body="Add manual flight records when booked." />}
        </section>
        <section>
          <h3>Hotels / stays</h3>
          {trip.hotels.length ? trip.hotels.map((hotel) => (
            <details className="logistics-card compact-logistics-card" key={hotel.id}>
              <summary>
                <div>
                  <p className="eyebrow">{hotel.city}</p>
                  <h3>{hotel.name}</h3>
                  <span>{hotel.checkIn || "Check-in TBD"} to {hotel.checkOut || "Check-out TBD"}</span>
                </div>
                <strong>{formatCadOnly(hotel.costLocal ?? hotel.estimatedCost, exchangeRate)}<small>{getLocalCostSubtext(hotel.costLocal ?? hotel.estimatedCost, hotel.localCurrencyCode || hotel.currency)}</small></strong>
              </summary>
              <div className="compact-details">
                <label className="field"><span>Stay</span><input value={hotel.name} onChange={(event) => updateHotel(hotel.id, { name: event.target.value })} /></label>
                <label className="field">
                  <span>Cost in CAD</span>
                  <input
                    type="number"
                    value={Math.round((hotel.costLocal ?? hotel.estimatedCost) / exchangeRate)}
                    onChange={(event) => updateHotel(hotel.id, { estimatedCost: Math.round(Number(event.target.value) * exchangeRate) })}
                  />
                </label>
                {hotel.address && <p>{hotel.address}</p>}
                <p>{cleanUiText(hotel.notes) || "No hotel notes yet."}</p>
              </div>
            </details>
          )) : <EmptyState title="No hotels yet" body="Lodging cards are ready when you add stays." />}
        </section>
      </div>
      <section>
        <h3>Transfers</h3>
        <div className="logistics-grid logistics-grid-compact">
          {transferActivities.length ? transferActivities.map((activity) => (
            <article className="logistics-card transfer-card" key={activity.id}>
              <p className="eyebrow">Day {activity.day} · {activity.city}</p>
              <h3>{activity.title}</h3>
              <p>{cleanUiText(routeTimeLabel(activity) || activity.duration) || "Timing not set"}</p>
            </article>
          )) : transferSuggestions.length ? transferSuggestions.map((suggestion) => (
            <article className="logistics-card transfer-card" key={suggestion.id}>
              <p className="eyebrow">{suggestion.day ? `Day ${suggestion.day}` : suggestion.city || "Route"}</p>
              <h3>{suggestion.title}</h3>
              <p>{suggestion.detail}</p>
            </article>
          )) : <EmptyState title="No transfers added" body="Flights and city transfers will appear here." />}
        </div>
      </section>
      <section>
        <h3>Attachments</h3>
        {trip.attachments.length ? (
          <div className="attachment-grid">
            {trip.attachments.map((attachment) => <AttachmentCard key={attachment.id} attachment={attachment} />)}
          </div>
        ) : <EmptyState title="No attachments yet" body="Tickets, confirmations, and PDFs can be linked later." />}
      </section>
    </section>
  );
}

function FlightCard({ flight, exchangeRate, tripCurrency }: { flight: TripFlight; exchangeRate: number; tripCurrency: string }) {
  const localCost = flight.costLocal ?? Math.round((flight.costCad || 0) * exchangeRate);
  return (
    <details className="logistics-card compact-logistics-card">
      <summary>
        <div>
          <p className="eyebrow">{formatDate(flight.departureTime.slice(0, 10))}</p>
          <h3>{flight.airline} {flight.flightNumber}</h3>
          <span>{flight.departureAirport} to {flight.arrivalAirport}</span>
        </div>
        {(flight.costLocal || flight.costCad) && <strong>{formatCadOnly(localCost, exchangeRate)}<small>{getLocalCostSubtext(localCost, flight.localCurrencyCode || tripCurrency)}</small></strong>}
      </summary>
      <div className="compact-details">
        <p>{flight.departureTime} to {flight.arrivalTime}</p>
        {flight.confirmation && <p>Confirmation: {flight.confirmation}</p>}
        {flight.notes && <p>{cleanUiText(flight.notes)}</p>}
      </div>
    </details>
  );
}

function AttachmentCard({ attachment }: { attachment: TripAttachment }) {
  const displayName = attachment.fileName
    .replace(/Trip to Peru . Wanderlog\.pdf/i, "Wanderlog trip details")
    .replace(/Trip to Peru – Wanderlog\.pdf/i, "Wanderlog trip details")
    .replace(/google-doc-source-needs-export\.md/i, "Google Doc notes");
  const note = cleanUiText(attachment.note).replace(/local Wanderlog PDF/gi, "saved Wanderlog export").replace(/PDF/gi, "file");
  return (
    <article className="attachment-card">
      <FileText size={18} aria-hidden="true" />
      <div>
        <h3>{displayName}</h3>
        <p>{note}</p>
        <span>{attachment.isSensitivePlaceholder ? "local-only placeholder" : "linked reference"}</span>
      </div>
    </article>
  );
}

function MapsExport({
  trip,
  activities,
  allActivities,
  copyRows,
  downloadCsv,
  exchangeRate,
  onAddPlace,
}: {
  trip: Trip;
  activities: TripActivity[];
  allActivities: TripActivity[];
  copyRows: (rows: ReturnType<typeof exportRows>) => Promise<void>;
  downloadCsv: (rows?: ReturnType<typeof exportRows>) => void;
  exchangeRate: number;
  onAddPlace: (place: OpenPlaceSearchResult, day: number) => void;
}) {
  const rows = exportRows(activities);
  const categories = Array.from(new Set(allActivities.map((activity) => activity.category))).sort();
  const days = Array.from(new Set(allActivities.map((activity) => activity.day))).sort((a, b) => a - b);
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Open map export</p>
          <h2>{trip.title} export</h2>
        </div>
        <MapIcon size={22} aria-hidden="true" />
      </div>
      <div className="maps-toolbar">
        <button className="primary-button" type="button" onClick={() => copyRows(exportRows(allActivities))}><Clipboard size={17} /> Copy all</button>
        <button className="ghost-button" type="button" onClick={() => downloadCsv(exportRows(allActivities))}><Download size={17} /> Download CSV</button>
      </div>
      <TripMapPanel trip={trip} activities={activities} selectedDay={activities[0]?.day || "All"} onAddPlace={onAddPlace} />
      <div className="export-group-grid">
        <section>
          <h3>By category</h3>
          {categories.map((category) => {
            const categoryRows = exportRows(allActivities.filter((activity) => activity.category === category));
            return (
              <button key={category} className="export-row-button" type="button" onClick={() => copyRows(categoryRows)}>
                <span>{category}</span>
                <strong>{categoryRows.length} rows</strong>
              </button>
            );
          })}
        </section>
        <section>
          <h3>By day</h3>
          {days.map((day) => {
            const dayRows = exportRows(allActivities.filter((activity) => activity.day === day));
            return (
              <button key={day} className="export-row-button" type="button" onClick={() => copyRows(dayRows)}>
                <span>Day {day}</span>
                <strong>{dayRows.length} rows</strong>
              </button>
            );
          })}
        </section>
      </div>
      {rows.length ? (
        <div className="maps-list">
          {rows.map((row) => (
            <article className="maps-row" key={`${row.day}-${row.place}`}>
              <strong>{row.place}</strong>
              <span>{row.address || row.query}</span>
              <small>Day {row.day} | {row.category} | {formatCadOnly(Number(row.estimatedCost), exchangeRate)}{getLocalCostSubtext(Number(row.estimatedCost), row.currency) ? ` (${getLocalCostSubtext(Number(row.estimatedCost), row.currency)})` : ""} | {row.travelTime || "travel time TBD"}</small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No export rows" body="Adjust filters or switch trips to generate map rows." />
      )}
    </section>
  );
}

function AssistantPanel({ trip, activities, routeSuggestions }: { trip: Trip; activities: TripActivity[]; routeSuggestions: RouteSuggestion[] }) {
  const [activePrompt, setActivePrompt] = useState("make this day lighter");
  const rainy = activities.filter((activity) => /rain|weather|boat|mountain|outdoor|hike/i.test(`${activity.description} ${activity.notes} ${activity.title}`)).slice(0, 5);
  const cheaper = activities.filter((activity) => activity.estimatedCost > (trip.currency === "JPY" ? 12000 : 100)).slice(0, 5);
  const foodCount = activities.filter((activity) => activity.type === "food" || activity.category === "Food").length;
  const promptCopy: Record<string, string> = {
    "make this day lighter": "Look at the warning cards below and move one optional or low-priority stop out of any crowded day.",
    "optimize this route": "Use the route preview and day chips to keep each day anchored around one city or base. Live route optimization is not connected yet.",
    "find cheaper alternatives": cheaper.length ? "The high-cost list below is the starting point. Mark one as optional or lower the budget after you compare options." : "No high-cost cards are currently crossing the local rule threshold.",
    "add more food stops": foodCount ? `${foodCount} food stops are already tagged. Add a custom Food card on light days if meals need more structure.` : "No food cards are tagged yet. Add Food stops to the lighter days first.",
    "turn this into a map list": "Open Map / Export, then copy rows or download the CSV. It is export-ready for map tools, not a direct sync.",
    "what should I skip if it rains?": rainy.length ? "Check the rain swaps below and keep outdoor or mountain stops flexible." : "No obvious rain-sensitive cards were found from the current notes.",
  };
  return (
    <section className="content-section assistant-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Local suggestions only</p>
          <h2>AI Assistant placeholder</h2>
        </div>
        <Bot size={22} aria-hidden="true" />
      </div>
      <p>This panel is wired for future prompts, but it does not call paid AI APIs yet. The suggestions below are local rules based on the current itinerary.</p>
      <div className="prompt-grid">
        {["make this day lighter", "optimize this route", "find cheaper alternatives", "add more food stops", "turn this into a map list", "what should I skip if it rains?"].map((prompt) => (
          <button key={prompt} type="button" className={activePrompt === prompt ? "ghost-button active-prompt" : "ghost-button"} onClick={() => setActivePrompt(prompt)}>{prompt}</button>
        ))}
      </div>
      <div className="source-note">
        <h3>{activePrompt}</h3>
        <p>{promptCopy[activePrompt]}</p>
      </div>
      <div className="assistant-grid">
        <section>
          <h3>Make it lighter</h3>
          <SuggestionList suggestions={routeSuggestions.filter((item) => item.severity === "warning")} />
        </section>
        <section>
          <h3>Rain swaps</h3>
          {rainy.length ? rainy.map((activity) => <p key={activity.id}><strong>{activity.title}:</strong> keep a nearby indoor or low-weather backup in notes.</p>) : <EmptyState title="No obvious rain-sensitive stops" body="Add weather notes to surface more swaps." />}
        </section>
        <section>
          <h3>Cheaper alternatives</h3>
          {cheaper.length ? cheaper.map((activity) => <p key={activity.id}><strong>{activity.title}:</strong> mark this optional or compare a lower-cost day plan.</p>) : <EmptyState title="No high-cost flags" body="Budget edits will update this list." />}
        </section>
      </div>
    </section>
  );
}

function ImportPanel({ trip, replaceActiveTrip }: { trip: Trip; replaceActiveTrip: (trip: Trip) => void }) {
  const [wanderlogText, setWanderlogText] = useState("");
  const [googleDocText, setGoogleDocText] = useState("");
  const [backupText, setBackupText] = useState("");
  const [message, setMessage] = useState("Pasted data is preview-only until you explicitly apply a JSON backup.");
  const isPeru = trip.id === "peru-2026";
  const isPortugal = trip.id === "portugal-2026";

  function previewPaste() {
    const wanderlogLines = wanderlogText.split(/\r?\n/).filter((line) => line.trim()).length;
    const googleLines = googleDocText.split(/\r?\n/).filter((line) => line.trim()).length;
    setMessage(`Preview only: ${wanderlogLines} Wanderlog lines and ${googleLines} Google Doc note lines detected. Unclear items should stay marked needs confirmation.`);
  }

  function previewBackup() {
    try {
      const parsed = JSON.parse(backupText) as Trip;
      setMessage(`Backup preview: ${parsed.title || "Untitled trip"} with ${parsed.activities?.length || 0} cards, ${parsed.flights?.length || 0} flights, and ${parsed.hotels?.length || 0} hotels.`);
    } catch {
      setMessage("JSON backup could not be parsed yet.");
    }
  }

  function applyBackup() {
    try {
      const parsed = JSON.parse(backupText) as Trip;
      if (parsed.id !== trip.id) {
        setMessage(`This backup is for ${parsed.id || "another trip"}, not ${trip.id}.`);
        return;
      }
      const expectedCurrency = trip.currency;
      const importedCurrencies = [
        parsed.currency,
        parsed.currencyConfig?.localCurrency,
        ...(parsed.activities || []).map((activity) => activity.localCurrencyCode || activity.currency),
        ...(parsed.hotels || []).map((hotel) => hotel.localCurrencyCode || hotel.currency),
        ...(parsed.flights || []).map((flight) => flight.localCurrencyCode).filter(Boolean),
      ];
      if (importedCurrencies.some((currency) => currency && currency !== expectedCurrency && currency !== "CAD")) {
        setMessage(`Currency mismatch: ${trip.title} backups should only use ${expectedCurrency} plus CAD comparison values.`);
        return;
      }
      if (!window.confirm(`Replace ${trip.title} with this JSON backup?`)) return;
      replaceActiveTrip(parsed);
      setMessage("JSON backup applied locally.");
    } catch {
      setMessage("JSON backup could not be applied.");
    }
  }

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(trip, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${trip.id}-backup.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="content-section import-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Non-destructive import</p>
          <h2>{trip.title} import and backup</h2>
        </div>
        <Import size={22} aria-hidden="true" />
      </div>

      {isPeru && (
        <div className="source-note">
          <h3>Peru source status</h3>
          <p>Public Wanderlog state plus the local Wanderlog PDF are imported: 55 dated cards, exact PDF route-leg timings, 16 daily route summaries, 4 flights, 10 lodging blocks, 2 train/transit blocks, and 19 CAD expenses. Add more Google Doc notes here only if the doc changes later.</p>
        </div>
      )}
      {isPortugal && (
        <div className="source-note">
          <h3>Portugal source status</h3>
          <p>The Google Docs PDF and Wanderlog PDF are imported: 17 dated days, booked flights, booked lodging, Wanderlog route timing text, CAD/EUR expenses, Portugal map rows, and the remaining booking checklist.</p>
        </div>
      )}

      <div className="textarea-grid">
        <label className="field">
          <span>Paste Wanderlog text or JSON</span>
          <textarea value={wanderlogText} onChange={(event) => setWanderlogText(event.target.value)} placeholder="Paste Wanderlog export here" />
        </label>
        <label className="field">
          <span>Paste Google Doc notes</span>
          <textarea value={googleDocText} onChange={(event) => setGoogleDocText(event.target.value)} placeholder="Add Google Doc note" />
        </label>
      </div>

      <div className="maps-toolbar">
        <button className="ghost-button" type="button" onClick={previewPaste}><Clipboard size={17} /> Preview pasted notes</button>
        <button className="primary-button" type="button" onClick={downloadBackup}><Download size={17} /> Export JSON backup</button>
      </div>

      <label className="field">
        <span>Restore from JSON backup</span>
        <textarea value={backupText} onChange={(event) => setBackupText(event.target.value)} placeholder={`Paste a ${trip.id} JSON backup here`} />
      </label>
      <div className="maps-toolbar">
        <button className="ghost-button" type="button" onClick={previewBackup}>Preview JSON backup</button>
        <button className="danger-button" type="button" onClick={applyBackup}>Apply JSON backup</button>
      </div>
      <p className="quiet-note">{message}</p>
    </section>
  );
}

function MorePanel({
  trip,
  activities,
  routeSuggestions,
  replaceActiveTrip,
}: {
  trip: Trip;
  activities: TripActivity[];
  routeSuggestions: RouteSuggestion[];
  replaceActiveTrip: (trip: Trip) => void;
}) {
  return (
    <div className="more-grid">
      <AssistantPanel trip={trip} activities={activities} routeSuggestions={routeSuggestions} />
      <ImportPanel trip={trip} replaceActiveTrip={replaceActiveTrip} />
    </div>
  );
}

function SuggestionList({ suggestions }: { suggestions: RouteSuggestion[] }) {
  if (!suggestions.length) return <EmptyState title="No route warnings" body="The current filters look manageable." />;
  return (
    <div className="suggestion-list">
      {suggestions.map((suggestion) => (
        <article className={`suggestion-card ${suggestion.severity}`} key={suggestion.id}>
          {suggestion.severity === "warning" ? <TriangleAlert size={18} /> : <CloudRain size={18} />}
          <div>
            <h3>{suggestion.title}</h3>
            <p>{suggestion.detail}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <Sparkles size={20} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export default App;
