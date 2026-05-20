import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
import { peruRouteSuggestions, peruTrip } from "./peruItinerary";
import type { RouteSuggestion, Trip, TripActivity, TripAttachment, TripCategory, TripFlight, TripHotel, TripId } from "./tripTypes";

type AppView = "dashboard" | "itinerary" | "places" | "budget" | "logistics" | "maps" | "assistant" | "import";
type ThemePreference = "system" | "light" | "dark";

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
const tripOrder: TripId[] = ["japan-2026", "peru-2026"];
const navItems: Array<{ id: AppView; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "itinerary", label: "Itinerary" },
  { id: "places", label: "Places" },
  { id: "budget", label: "Budget" },
  { id: "logistics", label: "Logistics" },
  { id: "maps", label: "Maps" },
  { id: "assistant", label: "AI" },
  { id: "import", label: "Import" },
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

function placeholderFor(text: string) {
  const hue = Math.abs([...text].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 360;
  return `linear-gradient(135deg, hsl(${hue} 45% 84%) 0%, hsl(${(hue + 42) % 360} 38% 92%) 52%, hsl(${(hue + 118) % 360} 35% 87%) 100%)`;
}

function parseStored<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : null;
  } catch {
    return null;
  }
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
  const editableMerge = (base: TripActivity, stored?: TripActivity): TripActivity => {
    if (!stored) return base;
    const sameCurrency = stored.currency === base.currency;
    return {
      ...base,
      notes: stored.notes || base.notes,
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
      imageUrl: stored.imageUrl || base.imageUrl || placeholderFor(base.title),
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
    },
    japanBranch,
    japanCadToJpy: legacy?.cadToJpy || DEFAULT_CAD_TO_JPY,
    themePreference: "system",
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
    themePreference: stored.themePreference || "system",
    trips: {
      "japan-2026": mergeTrip(defaults.trips["japan-2026"], stored.trips["japan-2026"]),
      "peru-2026": mergeTrip(peruTrip, stored.trips["peru-2026"]),
    },
  };
}

function formatDate(date?: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function formatMoney(value: number, currency: string, localPerCad = DEFAULT_CAD_TO_JPY) {
  if (currency === "JPY") {
    const jpy = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(Math.round(value));
    const cad = `CAD ${new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(Math.round(value / localPerCad))}`;
    return `${jpy} (${cad})`;
  }
  if (currency === "PEN") {
    const pen = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 }).format(Math.round(value));
    const cad = `CAD ${new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(Math.round(value / localPerCad))}`;
    return `${pen} (${cad})`;
  }
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function getExchangeRate(trip: Trip, japanCadToJpy: number) {
  return trip.currencyConfig?.localPerCad || (trip.currency === "JPY" ? japanCadToJpy : 1);
}

function getCurrencyLabel(trip: Trip) {
  return trip.currencyConfig?.label || `${trip.currency} per 1 CAD`;
}

function getCostLabel(activity: TripActivity, exchangeRate: number) {
  const cost = activity.costLocal ?? activity.estimatedCost;
  if (!cost && activity.costStatus === "needs-confirmation") return "Cost needs confirmation";
  return `${formatMoney(cost, activity.localCurrencyCode || activity.currency, exchangeRate)}${activity.costCategory ? ` | ${activity.costCategory}` : ""}`;
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
    .sort((a, b) => a.day - b.day || a.category.localeCompare(b.category) || a.priority - b.priority)
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
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const activeTrip = state.trips[state.activeTripId];
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

  const budget = useMemo(() => makeBudget(activeTrip, allVisibleActivities), [activeTrip, allVisibleActivities]);
  const routeSuggestions = useMemo(() => makeRouteSuggestions(activeTrip, allVisibleActivities), [activeTrip, allVisibleActivities]);
  const resolvedTheme = state.themePreference === "system" ? (systemDark ? "dark" : "light") : state.themePreference;
  const activeExchangeRate = getExchangeRate(activeTrip, state.japanCadToJpy);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

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
    setActiveView("places");
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
    const nextTrip = activeTrip.id === "japan-2026" ? buildJapanTrip() : peruTrip;
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="skip-link" href="#main-content">Skip to itinerary</a>
        <div className="brand-block">
          <p className="eyebrow">Local-first travel command center</p>
          <h1>Itinerary Mate</h1>
          <p>{activeTrip.description}</p>
        </div>
        <div className="topbar-actions">
          <TripSwitcher activeTripId={state.activeTripId} setActiveTripId={(activeTripId) => updateState({ activeTripId })} />
          <ThemeToggle preference={state.themePreference} resolvedTheme={resolvedTheme} setPreference={(themePreference) => updateState({ themePreference })} />
          <span className="save-pill"><BadgeCheck size={16} aria-hidden="true" /> {saveStatus}</span>
          <button className="ghost-button" type="button" onClick={resetActiveTrip}>
            <RotateCcw size={17} aria-hidden="true" /> Reset trip
          </button>
        </div>
      </header>

      <nav className="nav-tabs" aria-label="Planner sections">
        {navItems.map((item) => (
          <button key={item.id} type="button" className={activeView === item.id ? "active" : ""} onClick={() => setActiveView(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>

      <main id="main-content" className="main-grid">
        <aside className="side-panel">
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
            {activeTrip.id === "japan-2026" && (
              <BranchToggle branch={state.japanBranch} setBranch={(japanBranch) => updateState({ japanBranch })} cadToJpy={state.japanCadToJpy} />
            )}
          </section>

          <section className="card quick-card">
            <p className="eyebrow">Rough total</p>
            <strong>{formatMoney(budget.total.mid, activeTrip.currency, activeExchangeRate)}</strong>
            <span>Low {formatMoney(budget.total.low, activeTrip.currency, activeExchangeRate)}. High {formatMoney(budget.total.high, activeTrip.currency, activeExchangeRate)}.</span>
            <label className="field compact-field">
              <span>Planning rate</span>
              <input type="number" min="0.01" step="0.01" value={activeExchangeRate} onChange={(event) => setActiveExchangeRate(Math.max(0.01, Number(event.target.value)))} />
              <small>{getCurrencyLabel(activeTrip)}, rough planning only</small>
            </label>
          </section>

          <section className="card quick-card">
            <p className="eyebrow">Offline</p>
            <strong>Installable PWA</strong>
            <span>Core app and saved edits work offline. External images and live data may not.</span>
          </section>
        </aside>

        <div className="content-stack">
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
          />

          {activeView === "dashboard" && (
            <Dashboard
              trip={activeTrip}
              activities={allVisibleActivities}
              budget={budget}
              exchangeRate={activeExchangeRate}
              routeSuggestions={routeSuggestions}
            />
          )}

          {activeView === "itinerary" && (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <ItineraryTimeline
                days={days}
                activities={filteredActivities}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                updateActivity={updateActivity}
                deleteActivity={deleteActivity}
                brokenImageIds={brokenImageIds}
                setBrokenImageIds={setBrokenImageIds}
                trip={activeTrip}
                exchangeRate={activeExchangeRate}
              />
            </DndContext>
          )}

          {activeView === "places" && (
            <PlaceBrowser
              activities={filteredActivities}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              updateActivity={updateActivity}
              deleteActivity={deleteActivity}
              brokenImageIds={brokenImageIds}
              setBrokenImageIds={setBrokenImageIds}
              trip={activeTrip}
              exchangeRate={activeExchangeRate}
            />
          )}

          {activeView === "budget" && (
            <BudgetDashboard trip={activeTrip} activities={allVisibleActivities} budget={budget} updateActivity={updateActivity} exchangeRate={activeExchangeRate} />
          )}

          {activeView === "logistics" && (
            <LogisticsPanel trip={activeTrip} updateHotel={updateHotel} routeSuggestions={routeSuggestions} exchangeRate={activeExchangeRate} />
          )}

          {activeView === "maps" && (
            <MapsExport
              trip={activeTrip}
              activities={filteredActivities}
              allActivities={allVisibleActivities}
              copyRows={async (rows) => {
                await copyText(rows.map((row) => `${row.place} | ${row.address || row.query} | Day ${row.day} | ${row.category} | ${row.estimatedCost} ${row.currency} | CAD ${row.cadCost || "estimate"} | ${row.notes}`).join("\n"));
                setSaveStatus("Copied Google Maps rows");
              }}
              downloadCsv={downloadCsv}
              exchangeRate={activeExchangeRate}
            />
          )}

          {activeView === "assistant" && (
            <AssistantPanel trip={activeTrip} activities={allVisibleActivities} routeSuggestions={routeSuggestions} />
          )}

          {activeView === "import" && (
            <ImportPanel trip={activeTrip} replaceActiveTrip={replaceActiveTrip} />
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
  const suggestions: RouteSuggestion[] = trip.id === "peru-2026" ? [...peruRouteSuggestions] : [];
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
      detail: "This is heuristic only. A Google Maps or Mapbox service can later replace these suggestions with live travel times.",
    });
  }
  return suggestions;
}

function TripSwitcher({ activeTripId, setActiveTripId }: { activeTripId: TripId; setActiveTripId: (id: TripId) => void }) {
  return (
    <div className="trip-switcher" aria-label="Trip switcher">
      {tripOrder.map((tripId) => (
        <button key={tripId} type="button" className={activeTripId === tripId ? "active" : ""} onClick={() => setActiveTripId(tripId)}>
          {tripId === "japan-2026" ? "Japan Trip" : "Peru Trip"}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle({ preference, resolvedTheme, setPreference }: { preference: ThemePreference; resolvedTheme: string; setPreference: (preference: ThemePreference) => void }) {
  const next = preference === "system" ? "dark" : preference === "dark" ? "light" : "system";
  return (
    <button className="ghost-button" type="button" onClick={() => setPreference(next)} title="Toggle theme">
      {resolvedTheme === "dark" ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
      {preference === "system" ? "System" : preference}
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
}) {
  return (
    <section className="filter-bar" aria-label="Trip filters">
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
      <div className="filter-selects">
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
      </div>
    </section>
  );
}

function Dashboard({ trip, activities, budget, exchangeRate, routeSuggestions }: { trip: Trip; activities: TripActivity[]; budget: ReturnType<typeof makeBudget>; exchangeRate: number; routeSuggestions: RouteSuggestion[] }) {
  const booked = activities.filter((activity) => activity.isBooked).length + trip.flights.filter((flight) => flight.status === "booked" || flight.status === "manual / not live yet").length;
  const incomplete = activities.filter((activity) => !activity.isCompleted).length;
  const nextFlight = trip.flights.find((flight) => new Date(flight.departureTime).getTime() >= Date.now()) || trip.flights[0];
  const nextHotel = trip.hotels[0];
  const totalDays = Math.max(...activities.map((activity) => activity.day), 1);
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
        <MetricCard label="Rough estimate" value={formatMoney(budget.total.mid, trip.currency, exchangeRate)} detail="Editable, local-first budget" icon={<CircleDollarSign size={18} />} />
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
      ) : (
        <div className="overview-grid">
          {["Altitude first", "Sacred Valley", "Machu Picchu", "Arequipa and Colca", "Coast reset", "Lima buffer"].map((title) => (
            <article className="anchor-card" key={title}>
              <h3>{title}</h3>
              <p>{peruAnchorCopy(title)}</p>
            </article>
          ))}
        </div>
      )}

      <SuggestionList suggestions={routeSuggestions.slice(0, 4)} />
    </section>
  );
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
  setBrokenImageIds: (ids: Set<string>) => void;
  trip: Trip;
  exchangeRate: number;
}) {
  return (
    <section className={`timeline content-section ${props.trip.id === "peru-2026" ? "wanderlog-timeline" : ""}`}>
      {props.days.map((day) => {
        const dayActivities = props.activities.filter((activity) => activity.day === day);
        const pacing = dayScore(dayActivities);
        const routeSummary = dayActivities.map((activity) => activity.city).filter(Boolean).filter((city, index, list) => list.indexOf(city) === index).join(" -> ");
        return (
          <DayDropZone key={day} day={day}>
            <details className="day-details" open>
            <summary className="day-header day-summary">
              <div>
                <p className="eyebrow">Day {day}</p>
                <h2>{dayActivities[0]?.city || "Open day"}</h2>
                {props.trip.id === "peru-2026" && dayActivities.length > 0 && <span className="route-summary">{routeSummary || "Route needs confirmation"}</span>}
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
                    {props.trip.id === "peru-2026" && index > 0 && (
                      <div className={activity.isRouteEstimate ? "route-connector estimate" : "route-connector"}>
                        <span>{activity.routeLegEstimate || activity.travelTimeFromPrevious || "Travel time missing"}</span>
                        {activity.isRouteEstimate && <em>estimate</em>}
                      </div>
                    )}
                    <ActivityCard activity={activity} {...props} />
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
  return <article ref={setNodeRef} className={isOver ? "day-card drop-active" : "day-card"}>{children}</article>;
}

function ActivityCard({
  activity,
  expandedId,
  setExpandedId,
  updateActivity,
  deleteActivity,
  brokenImageIds,
  setBrokenImageIds,
  trip,
  exchangeRate,
}: {
  activity: TripActivity;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  updateActivity: (id: string, patch: Partial<TripActivity>) => void;
  deleteActivity: (id: string) => void;
  brokenImageIds: Set<string>;
  setBrokenImageIds: (ids: Set<string>) => void;
  trip: Trip;
  exchangeRate: number;
}) {
  const expanded = expandedId === activity.id;
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: activity.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const hasImage = activity.imageUrl && !activity.imageUrl.startsWith("linear-gradient") && !brokenImageIds.has(activity.id);
  const needsConfirmation = Boolean(activity.needsConfirmationReasons?.length || activity.costStatus === "needs-confirmation" || activity.bookingStatus === "needs-confirmation");
  return (
    <article className={`place-card type-${activity.type || "activity"}${activity.isCompleted ? " completed" : ""}`} ref={setNodeRef} style={style}>
      <div className="card-image" style={{ background: hasImage ? undefined : activity.imageUrl || placeholderFor(activity.title) }}>
        {hasImage && <img src={activity.imageUrl} alt={activity.imageAlt || activity.title} loading="lazy" onError={() => setBrokenImageIds(new Set([...brokenImageIds, activity.id]))} />}
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
          <button className="icon-button" type="button" onClick={() => setExpandedId(expanded ? null : activity.id)} aria-expanded={expanded}>
            <ChevronDown size={17} aria-hidden="true" />
          </button>
        </div>
        <p>{activity.description}</p>
        {activity.address && <p className="address-line"><MapPin size={14} aria-hidden="true" /> {activity.address}</p>}
        <div className="meta-chips">
          <span><CircleDollarSign size={14} /> {getCostLabel(activity, exchangeRate)}</span>
          <span><MapPin size={14} /> {activity.travelTimeFromPrevious || "Add travel time"}</span>
          <span><BadgeCheck size={14} /> {activity.isBooked || activity.bookingStatus === "booked" ? "Booked" : "Not booked"}</span>
          <span><Sparkles size={14} /> Priority {activity.priority}</span>
          {needsConfirmation && <span className="needs-confirmation"><TriangleAlert size={14} /> Needs confirmation</span>}
          {activity.source && <span>{activity.source}</span>}
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
  setBrokenImageIds: (ids: Set<string>) => void;
  trip: Trip;
  exchangeRate: number;
}

function PlaceBrowser(props: ActivityListProps) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Map-list browser</p>
          <h2>{props.activities.length} visible places</h2>
        </div>
        <MapIcon size={22} aria-hidden="true" />
      </div>
      {props.activities.length ? (
        <div className="activity-grid browser-grid">
          {props.activities.map((activity) => <ActivityCard key={activity.id} activity={activity} {...props} />)}
        </div>
      ) : (
        <EmptyState title="No matching places" body="Clear a filter or add a custom activity for this trip." />
      )}
    </section>
  );
}

function BudgetDashboard({ trip, activities, budget, updateActivity, exchangeRate }: { trip: Trip; activities: TripActivity[]; budget: ReturnType<typeof makeBudget>; updateActivity: (id: string, patch: Partial<TripActivity>) => void; exchangeRate: number }) {
  const categoryRows = Object.entries(budget.categories);
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Rough estimates</p>
          <h2>Budget dashboard</h2>
        </div>
        <CircleDollarSign size={22} aria-hidden="true" />
      </div>
      <div className="budget-hero">
        <MetricCard label="Low" value={formatMoney(budget.total.low, trip.currency, exchangeRate)} detail="Lean planning estimate" icon={<CircleDollarSign size={18} />} />
        <MetricCard label="Mid" value={formatMoney(budget.total.mid, trip.currency, exchangeRate)} detail="Main working estimate" icon={<CircleDollarSign size={18} />} />
        <MetricCard label="High" value={formatMoney(budget.total.high, trip.currency, exchangeRate)} detail="Comfort buffer estimate" icon={<CircleDollarSign size={18} />} />
      </div>
      <div className="budget-columns">
        <section>
          <h3>By category</h3>
          {categoryRows.map(([category, range]) => (
            <div className="budget-row" key={category}>
              <span>{category}</span>
              <strong>{formatMoney(range.mid, trip.currency, exchangeRate)}</strong>
            </div>
          ))}
        </section>
        <section>
          <h3>By city</h3>
          {Object.entries(budget.byCity).map(([city, range]) => (
            <div className="budget-row" key={city}>
              <span>{city}</span>
              <strong>{formatMoney(range.mid, trip.currency, exchangeRate)}</strong>
            </div>
          ))}
        </section>
      </div>
      <section className="inline-editor">
        <h3>Quick cost edits</h3>
        <p className="quiet-note">Edits use {trip.currency} as the source currency and recalculate the CAD comparison from the current rough planning rate.</p>
        {activities.slice(0, 12).map((activity) => (
          <label className="budget-edit-row" key={activity.id}>
            <span>{activity.title}</span>
            <input type="number" min="0" value={activity.costLocal ?? activity.estimatedCost} onChange={(event) => updateActivity(activity.id, { estimatedCost: Number(event.target.value) })} />
            <small>{activity.localCurrencyCode || activity.currency}</small>
          </label>
        ))}
      </section>
    </section>
  );
}

function LogisticsPanel({ trip, updateHotel, routeSuggestions, exchangeRate }: { trip: Trip; updateHotel: (id: string, patch: Partial<TripHotel>) => void; routeSuggestions: RouteSuggestion[]; exchangeRate: number }) {
  return (
    <section className="content-section logistics-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Flights, lodging, files</p>
          <h2>Logistics</h2>
        </div>
        <Plane size={22} aria-hidden="true" />
      </div>
      <div className="logistics-grid">
        <section>
          <h3>Manual flight tracker</h3>
          {trip.flights.length ? trip.flights.map((flight) => <FlightCard key={flight.id} flight={flight} exchangeRate={exchangeRate} tripCurrency={trip.currency} />) : <EmptyState title="No flights yet" body="Add manual flight records when booked." />}
        </section>
        <section>
          <h3>Lodging</h3>
          {trip.hotels.length ? trip.hotels.map((hotel) => (
            <article className="logistics-card" key={hotel.id}>
              <p className="eyebrow">{hotel.city}</p>
              <label className="field"><span>Stay</span><input value={hotel.name} onChange={(event) => updateHotel(hotel.id, { name: event.target.value })} /></label>
              <label className="field"><span>Rough cost ({hotel.localCurrencyCode || hotel.currency})</span><input type="number" value={hotel.costLocal ?? hotel.estimatedCost} onChange={(event) => updateHotel(hotel.id, { estimatedCost: Number(event.target.value) })} /></label>
              <div className="mini-tags">
                <span>{formatMoney(hotel.costLocal ?? hotel.estimatedCost, hotel.localCurrencyCode || hotel.currency, exchangeRate)}</span>
                <span>{hotel.costStatus || "rough estimate"}</span>
              </div>
              <p>{hotel.notes || "No hotel notes yet."}</p>
            </article>
          )) : <EmptyState title="No hotels yet" body="Lodging cards are ready when you add stays." />}
        </section>
      </div>
      <section>
        <h3>Attachments</h3>
        <div className="attachment-grid">
          {trip.attachments.map((attachment) => <AttachmentCard key={attachment.id} attachment={attachment} />)}
        </div>
      </section>
      <SuggestionList suggestions={routeSuggestions} />
      <div className="api-note">
        <h3>Future routing API interface</h3>
        <p>Route suggestions are simple heuristics for now: city grouping, crowded-day warnings, and backtracking checks. Google Maps or Mapbox can plug in later with API keys outside the client bundle.</p>
      </div>
    </section>
  );
}

function FlightCard({ flight, exchangeRate, tripCurrency }: { flight: TripFlight; exchangeRate: number; tripCurrency: string }) {
  return (
    <article className="logistics-card">
      <p className="eyebrow">Manual status, not live</p>
      <h3>{flight.airline} {flight.flightNumber}</h3>
      <p>{flight.departureAirport} to {flight.arrivalAirport}</p>
      <div className="mini-tags">
        <span>{formatDate(flight.departureTime.slice(0, 10))}</span>
        <span>{flight.status}</span>
        {(flight.costLocal || flight.costCad) && <span>{formatMoney(flight.costLocal ?? Math.round((flight.costCad || 0) * exchangeRate), flight.localCurrencyCode || tripCurrency, exchangeRate)}</span>}
      </div>
      <p>{flight.notes}</p>
    </article>
  );
}

function AttachmentCard({ attachment }: { attachment: TripAttachment }) {
  return (
    <article className="attachment-card">
      <FileText size={18} aria-hidden="true" />
      <div>
        <h3>{attachment.fileName}</h3>
        <p>{attachment.note}</p>
        <span>{attachment.type}{attachment.isSensitivePlaceholder ? " | local-only placeholder" : ""}</span>
      </div>
    </article>
  );
}

function MapsExport({ trip, activities, allActivities, copyRows, downloadCsv, exchangeRate }: { trip: Trip; activities: TripActivity[]; allActivities: TripActivity[]; copyRows: (rows: ReturnType<typeof exportRows>) => Promise<void>; downloadCsv: (rows?: ReturnType<typeof exportRows>) => void; exchangeRate: number }) {
  const rows = exportRows(activities);
  const categories = Array.from(new Set(allActivities.map((activity) => activity.category))).sort();
  const days = Array.from(new Set(allActivities.map((activity) => activity.day))).sort((a, b) => a - b);
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Google Maps ready</p>
          <h2>{trip.title} export</h2>
        </div>
        <MapIcon size={22} aria-hidden="true" />
      </div>
      <div className="maps-toolbar">
        <button className="primary-button" type="button" onClick={() => copyRows(exportRows(allActivities))}><Clipboard size={17} /> Copy all</button>
        <button className="ghost-button" type="button" onClick={() => downloadCsv(exportRows(allActivities))}><Download size={17} /> Download CSV</button>
      </div>
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
              <small>Day {row.day} | {row.category} | {formatMoney(row.estimatedCost, row.currency, exchangeRate)} | {row.travelTime || "travel time TBD"}{row.costStatus ? ` | ${row.costStatus}` : ""}</small>
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
  const rainy = activities.filter((activity) => /rain|weather|boat|mountain|outdoor|hike/i.test(`${activity.description} ${activity.notes} ${activity.title}`)).slice(0, 5);
  const cheaper = activities.filter((activity) => activity.estimatedCost > (trip.currency === "JPY" ? 12000 : 100)).slice(0, 5);
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
        {["make this day lighter", "optimize this route", "find cheaper alternatives", "add more food stops", "turn this into a Google Maps list", "what should I skip if it rains?"].map((prompt) => (
          <button key={prompt} type="button" className="ghost-button">{prompt}</button>
        ))}
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
          <p>Public Wanderlog state is already imported: 55 dated cards, 4 flights, 10 lodging blocks, 2 train/transit blocks, and 19 CAD expenses. The Google Doc export redirects to sign-in, so its notes need to be pasted here before they can be used.</p>
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
