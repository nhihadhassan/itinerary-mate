import { useEffect, useMemo, useState } from "react";
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
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clipboard,
  CloudRain,
  Download,
  GripVertical,
  Hotel,
  Map as MapIcon,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Train,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  Activity,
  Category,
  DEFAULT_CAD_TO_JPY,
  TripBranch,
  categories,
  dailyCosts,
  defaultActivities,
  defaultStayAreas,
  reasonBuckets,
  routeMoves,
  specialExperiences,
  tripAnchors,
} from "./japanItinerary";

type BudgetKey = "estimatedCostLow" | "estimatedCostMid" | "estimatedCostHigh";
type AppView = "overview" | "itinerary" | "places" | "budget" | "maps";

interface PersistedState {
  version: 1;
  activities: Activity[];
  branch: TripBranch;
  cadToJpy: number;
  stayAreas: typeof defaultStayAreas;
  updatedAt: string;
}

interface BudgetTriple {
  low: number;
  mid: number;
  high: number;
}

const STORAGE_KEY = "september-japan-planner-v1";

const navItems: Array<{ id: AppView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "itinerary", label: "Itinerary" },
  { id: "places", label: "Places" },
  { id: "budget", label: "Budget" },
  { id: "maps", label: "Maps" },
];

const days = Array.from({ length: 30 }, (_, index) => index + 1);

const placeholderThemes = [
  "linear-gradient(135deg, #d9f0ff 0%, #f8e5d2 48%, #f7fbef 100%)",
  "linear-gradient(135deg, #e4efe7 0%, #f5ead6 50%, #d6e8f5 100%)",
  "linear-gradient(135deg, #f7dfd4 0%, #eef3df 52%, #dbe9f6 100%)",
  "linear-gradient(135deg, #e1edf1 0%, #f8e6c8 54%, #f6f1f7 100%)",
];

function loadState(): PersistedState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) throw new Error("No stored state");
    const parsed = JSON.parse(stored) as PersistedState;
    if (parsed.version !== 1 || !Array.isArray(parsed.activities)) throw new Error("Bad stored state");
    return {
      ...parsed,
      activities: hydrateActivities(parsed.activities),
      stayAreas: parsed.stayAreas?.length ? parsed.stayAreas : defaultStayAreas,
      cadToJpy: parsed.cadToJpy || DEFAULT_CAD_TO_JPY,
      branch: parsed.branch || "hokkaido",
    };
  } catch {
    return {
      version: 1,
      activities: hydrateActivities(defaultActivities),
      branch: "hokkaido",
      cadToJpy: DEFAULT_CAD_TO_JPY,
      stayAreas: defaultStayAreas,
      updatedAt: new Date().toISOString(),
    };
  }
}

function hydrateActivities(activities: Activity[]) {
  const defaultsById = new Map(defaultActivities.map((activity) => [activity.id, activity]));
  return activities.map((activity) => {
    const fallback = defaultsById.get(activity.id);
    return {
      ...activity,
      imageUrl: activity.imageUrl || fallback?.imageUrl || "",
      imageAlt: activity.imageAlt || fallback?.imageAlt || `Generated scenic placeholder for ${activity.title}.`,
      imageCredit: activity.imageCredit || fallback?.imageCredit,
      imageCreditUrl: activity.imageCreditUrl || fallback?.imageCreditUrl,
      imageLicense: activity.imageLicense || fallback?.imageLicense,
      imageSearchQuery: activity.imageSearchQuery || fallback?.imageSearchQuery || `${activity.title} ${activity.city} Japan`,
    };
  });
}

function formatJpy(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function formatCad(value: number, cadToJpy: number) {
  const amount = new Intl.NumberFormat("en-CA", {
    maximumFractionDigits: 0,
  }).format(Math.round(value / cadToJpy));
  return `CAD ${amount}`;
}

function moneyRange(low: number, mid: number, high: number, cadToJpy: number) {
  return `${formatJpy(low)}-${formatJpy(high)} | ${formatCad(low, cadToJpy)}-${formatCad(high, cadToJpy)}`;
}

function sumBudget(items: BudgetTriple[]): BudgetTriple {
  return items.reduce(
    (sum, item) => ({
      low: sum.low + item.low,
      mid: sum.mid + item.mid,
      high: sum.high + item.high,
    }),
    { low: 0, mid: 0, high: 0 },
  );
}

function getActiveActivities(activities: Activity[], branch: TripBranch) {
  return activities.filter((activity) => !activity.branch || activity.branch === branch);
}

function csvEscape(value: string | number | boolean) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function makeExportRows(activities: Activity[]) {
  return activities
    .slice()
    .sort((a, b) => a.category.localeCompare(b.category) || a.priority - b.priority || a.day - b.day)
    .map((activity) => ({
      place: activity.title,
      city: activity.city,
      query: activity.googleMapsQuery,
      category: activity.category,
      priority: activity.priority,
      note: activity.description,
      duration: activity.visitDuration,
      budget: `${activity.estimatedCostLow}-${activity.estimatedCostHigh} JPY`,
    }));
}

function rowsToCsv(rows: ReturnType<typeof makeExportRows>) {
  const header = ["Place name", "City", "Google Maps search query", "Category", "Priority", "Short note", "Estimated visit duration", "Estimated budget"];
  const body = rows.map((row) => [
    row.place,
    row.city,
    row.query,
    row.category,
    row.priority,
    row.note,
    row.duration,
    row.budget,
  ]);
  return [header, ...body].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function getDayPacing(dayActivities: Activity[]) {
  const hours = dayActivities.reduce((sum, item) => sum + item.durationHours, 0);
  const travelMinutes = dayActivities.reduce((sum, item) => sum + item.travelMinutesFromBase, 0);
  const heavyCount = dayActivities.filter((item) => item.energyLevel === "heavy").length;
  const score = hours + travelMinutes / 90 + heavyCount * 1.2;
  if (score >= 9 || dayActivities.length >= 4) return { label: "Too packed", tone: "danger", score };
  if (score >= 6.5 || heavyCount >= 1) return { label: "Full day", tone: "warn", score };
  if (score <= 2.5) return { label: "Light day", tone: "calm", score };
  return { label: "Balanced", tone: "good", score };
}

function useAppBudget(activities: Activity[], branch: TripBranch, stayAreas: typeof defaultStayAreas) {
  return useMemo(() => {
    const activeActivities = getActiveActivities(activities, branch);
    const activeStays = stayAreas.filter((stay) => !stay.branch || stay.branch === branch);
    const activeDaily = dailyCosts.filter((cost) => !cost.branch || cost.branch === branch);
    const activeMoves = routeMoves.filter((move) => !move.branch || move.branch === branch);

    const lodging = sumBudget(
      activeStays.map((stay) => ({
        low: stay.estimatedLowPerNight * stay.nights,
        mid: stay.estimatedMidPerNight * stay.nights,
        high: stay.estimatedHighPerNight * stay.nights,
      })),
    );
    const food = sumBudget(
      activeDaily.map((cost) => ({
        low: cost.foodLow * cost.days.length,
        mid: cost.foodMid * cost.days.length,
        high: cost.foodHigh * cost.days.length,
      })),
    );
    const localTransit = sumBudget(
      activeDaily.map((cost) => ({
        low: cost.localTransitLow * cost.days.length,
        mid: cost.localTransitMid * cost.days.length,
        high: cost.localTransitHigh * cost.days.length,
      })),
    );
    const cityTransport = sumBudget(
      activeMoves.map((move) => ({
        low: move.estimatedLow,
        mid: move.estimatedMid,
        high: move.estimatedHigh,
      })),
    );
    const attractions = sumBudget(
      activeActivities.map((activity) => ({
        low: activity.estimatedCostLow,
        mid: activity.estimatedCostMid,
        high: activity.estimatedCostHigh,
      })),
    );
    const misc = sumBudget(
      specialExperiences
        .filter((experience) => experience.category === "shopping/miscellaneous")
        .map((experience) => ({
          low: experience.estimatedLow,
          mid: experience.estimatedMid,
          high: experience.estimatedHigh,
        })),
    );
    const transport = {
      low: localTransit.low + cityTransport.low,
      mid: localTransit.mid + cityTransport.mid,
      high: localTransit.high + cityTransport.high,
    };
    const total = sumBudget([lodging, food, transport, attractions, misc]);

    const byCity = activeActivities.reduce<Record<string, BudgetTriple>>((acc, activity) => {
      acc[activity.city] ||= { low: 0, mid: 0, high: 0 };
      acc[activity.city].low += activity.estimatedCostLow;
      acc[activity.city].mid += activity.estimatedCostMid;
      acc[activity.city].high += activity.estimatedCostHigh;
      return acc;
    }, {});

    return {
      total,
      categories: { lodging, food, transport, attractions, "shopping/miscellaneous": misc },
      byCity,
      localTransit,
      cityTransport,
    };
  }, [activities, branch, stayAreas]);
}

function App() {
  const initial = useMemo(loadState, []);
  const [activities, setActivities] = useState<Activity[]>(initial.activities);
  const [branch, setBranch] = useState<TripBranch>(initial.branch);
  const [cadToJpy, setCadToJpy] = useState(initial.cadToJpy);
  const [stayAreas, setStayAreas] = useState(initial.stayAreas);
  const [activeView, setActiveView] = useState<AppView>("overview");
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [selectedCity, setSelectedCity] = useState("All");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(defaultActivities[0]?.id ?? null);
  const [saveStatus, setSaveStatus] = useState("Saved locally");
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(() => new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  useEffect(() => {
    const payload: PersistedState = {
      version: 1,
      activities,
      branch,
      cadToJpy,
      stayAreas,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSaveStatus(`Saved locally ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  }, [activities, branch, cadToJpy, stayAreas]);

  const activeActivities = useMemo(() => getActiveActivities(activities, branch), [activities, branch]);
  const cities = useMemo(() => ["All", ...Array.from(new Set(activeActivities.map((activity) => activity.city))).sort()], [activeActivities]);
  const filteredActivities = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeActivities.filter((activity) => {
      const categoryMatch = selectedCategory === "All" || activity.category === selectedCategory;
      const cityMatch = selectedCity === "All" || activity.city === selectedCity;
      const queryMatch =
        !q ||
        [activity.title, activity.city, activity.region, activity.description, activity.notes]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return categoryMatch && cityMatch && queryMatch;
    });
  }, [activeActivities, query, selectedCategory, selectedCity]);

  const budget = useAppBudget(activities, branch, stayAreas);
  const nextEditableDay = useMemo(() => {
    return days.find((day) => activeActivities.some((activity) => activity.day === day && !activity.isCompleted)) ?? 30;
  }, [activeActivities]);
  const tooPackedDays = useMemo(() => {
    return days.filter((day) => getDayPacing(activeActivities.filter((activity) => activity.day === day)).tone === "danger");
  }, [activeActivities]);

  function updateActivity(id: string, patch: Partial<Activity>) {
    setActivities((current) => current.map((activity) => (activity.id === id ? { ...activity, ...patch } : activity)));
  }

  function deleteActivity(id: string) {
    const item = activities.find((activity) => activity.id === id);
    if (!item || !window.confirm(`Delete "${item.title}" from the planner?`)) return;
    setActivities((current) => current.filter((activity) => activity.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function addActivity() {
    const id = `custom-${Date.now()}`;
    const newActivity: Activity = {
      id,
      day: nextEditableDay,
      title: "New custom activity",
      city: selectedCity === "All" ? "Tokyo" : selectedCity,
      region: selectedCity === "All" ? "Kanto" : "Custom",
      category: "Nice To Have",
      priority: 3,
      description: "Add why this belongs on the trip.",
      imageUrl: "",
      estimatedCostLow: 0,
      estimatedCostMid: 3000,
      estimatedCostHigh: 8000,
      visitDuration: "2-3 hr",
      durationHours: 2.5,
      travelTimeFromBase: "Add estimate",
      travelMinutesFromBase: 30,
      suggestedTimeOfDay: "flexible",
      energyLevel: "medium",
      bookingRequired: "optional",
      weatherSensitive: false,
      backupOption: "Add a nearby backup",
      notes: "",
      logisticsNotes: "Add routing notes if this affects the day.",
      googleMapsQuery: "New custom activity Japan",
      isBooked: false,
      isCompleted: false,
      imageAlt: "Generated scenic placeholder for a custom activity.",
      imageSearchQuery: "Custom Japan itinerary place",
    };
    setActivities((current) => [newActivity, ...current]);
    setExpandedId(id);
    setActiveView("places");
  }

  function resetPlanner() {
    if (!window.confirm("Reset the itinerary and budget edits back to the default planner?")) return;
    setActivities(defaultActivities);
    setBranch("hokkaido");
    setCadToJpy(DEFAULT_CAD_TO_JPY);
    setStayAreas(defaultStayAreas);
    setSelectedCategory("All");
    setSelectedCity("All");
    setQuery("");
    setExpandedId(defaultActivities[0]?.id ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : "";
    if (!overId.startsWith("day-")) return;
    const day = Number(overId.replace("day-", ""));
    if (!Number.isFinite(day)) return;
    updateActivity(id, { day });
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setSaveStatus("Copied to clipboard");
  }

  function downloadCsv(exportActivities = activeActivities) {
    const rows = makeExportRows(exportActivities);
    const blob = new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `japan-${branch}-maps-export.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="skip-link" href="#main-content">Skip to planner</a>
        <div>
          <p className="eyebrow">September 1-30, 2026</p>
          <h1>Japan trip planner</h1>
        </div>
        <div className="topbar-actions">
          <span className="save-pill"><BadgeCheck size={16} aria-hidden="true" /> {saveStatus}</span>
          <button className="ghost-button" type="button" onClick={resetPlanner}>
            <RotateCcw size={17} aria-hidden="true" /> Reset
          </button>
        </div>
      </header>

      <nav className="nav-tabs" aria-label="Planner sections">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activeView === item.id ? "active" : ""}
            onClick={() => setActiveView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main id="main-content" className="main-grid">
        <aside className="side-panel">
          <section className="card route-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Route</p>
                <h2>30-day shape</h2>
              </div>
              <Train size={20} aria-hidden="true" />
            </div>
            <div className="route-strip" aria-label="Trip route">
              {["Tokyo", "Fuji", "Kyoto", "Osaka", "Hiroshima", "Kanazawa", branch === "hokkaido" ? "Hokkaido" : "Kyushu", "Tokyo"].map((stop) => (
                <span key={stop}>{stop}</span>
              ))}
            </div>
            <BranchToggle branch={branch} setBranch={setBranch} cadToJpy={cadToJpy} />
          </section>

          <section className="card quick-card">
            <p className="eyebrow">Rough total</p>
            <strong>{formatJpy(budget.total.mid)}</strong>
            <span>{formatCad(budget.total.mid, cadToJpy)} mid estimate</span>
            <label className="field compact-field">
              <span>Planning rate</span>
              <input
                type="number"
                min="1"
                value={cadToJpy}
                onChange={(event) => setCadToJpy(Math.max(1, Number(event.target.value)))}
              />
              <small>JPY per 1 CAD</small>
            </label>
          </section>

          <section className="card quick-card">
            <p className="eyebrow">Pacing</p>
            <strong>{tooPackedDays.length ? `${tooPackedDays.length} tight days` : "No tight days"}</strong>
            <span>{tooPackedDays.length ? `Check days ${tooPackedDays.join(", ")}` : "The default route has breathing room."}</span>
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
            cities={cities}
            addActivity={addActivity}
          />

          {activeView === "overview" && (
            <Overview
              activities={activeActivities}
              budget={budget}
              branch={branch}
              setBranch={setBranch}
              cadToJpy={cadToJpy}
              nextEditableDay={nextEditableDay}
            />
          )}

          {activeView === "itinerary" && (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <ItineraryTimeline
              activities={filteredActivities}
              allActivities={activeActivities}
              cadToJpy={cadToJpy}
              updateActivity={updateActivity}
              deleteActivity={deleteActivity}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              brokenImageIds={brokenImageIds}
              markImageBroken={(id) => setBrokenImageIds((current) => new Set(current).add(id))}
            />
          </DndContext>
          )}

          {activeView === "places" && (
            <PlaceBrowser
              activities={filteredActivities}
              cadToJpy={cadToJpy}
              updateActivity={updateActivity}
              deleteActivity={deleteActivity}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              brokenImageIds={brokenImageIds}
              markImageBroken={(id) => setBrokenImageIds((current) => new Set(current).add(id))}
            />
          )}

          {activeView === "budget" && (
            <BudgetDashboard
              activities={activeActivities}
              budget={budget}
              cadToJpy={cadToJpy}
              stayAreas={stayAreas.filter((stay) => !stay.branch || stay.branch === branch)}
              setStayAreas={setStayAreas}
              branch={branch}
            />
          )}

          {activeView === "maps" && (
            <MapsExport
              activities={filteredActivities}
              allActivities={activeActivities}
              cadToJpy={cadToJpy}
              copyText={copyText}
              downloadCsv={downloadCsv}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function FilterBar({
  query,
  setQuery,
  selectedCategory,
  setSelectedCategory,
  selectedCity,
  setSelectedCity,
  cities,
  addActivity,
}: {
  query: string;
  setQuery: (value: string) => void;
  selectedCategory: Category | "All";
  setSelectedCategory: (value: Category | "All") => void;
  selectedCity: string;
  setSelectedCity: (value: string) => void;
  cities: string[];
  addActivity: () => void;
}) {
  return (
    <section className="filter-bar" aria-label="Planner filters">
      <label className="search-field">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search itinerary</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places, notes, cities" />
      </label>
      <div className="chip-scroll" aria-label="Category filters">
        {(["All", ...categories] as Array<Category | "All">).map((category) => (
          <button
            key={category}
            type="button"
            className={selectedCategory === category ? "chip active" : "chip"}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
      <label className="select-field">
        <span>City</span>
        <select value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)}>
          {cities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </label>
      <button className="primary-button" type="button" onClick={addActivity}>
        <Plus size={18} aria-hidden="true" /> Add
      </button>
    </section>
  );
}

function Overview({
  activities,
  budget,
  branch,
  setBranch,
  cadToJpy,
  nextEditableDay,
}: {
  activities: Activity[];
  budget: ReturnType<typeof useAppBudget>;
  branch: TripBranch;
  setBranch: (branch: TripBranch) => void;
  cadToJpy: number;
  nextEditableDay: number;
}) {
  const mustCount = activities.filter((activity) => activity.category === "Must See" || activity.category === "Non-Negotiable").length;
  return (
    <div className="view-stack">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Premium editable planner</p>
          <h2>One month in Japan, built around the reasons people actually go.</h2>
          <p>
            A route that starts big in Tokyo, slows down around Fuji, gives Kyoto real time, eats properly in Osaka,
            and keeps the final week flexible.
          </p>
        </div>
        <div className="hero-stats">
          <Stat label="Mid budget" value={formatJpy(budget.total.mid)} note={formatCad(budget.total.mid, cadToJpy)} />
          <Stat label="Core items" value={String(mustCount)} note="Must See + Non-Negotiable" />
          <Stat label="Next edit" value={`Day ${nextEditableDay}`} note="First incomplete day" />
        </div>
      </section>

      <section className="anchor-grid">
        {tripAnchors.map((anchor) => (
          <article className="anchor-card" key={anchor.title}>
            <Sparkles size={18} aria-hidden="true" />
            <h3>{anchor.title}</h3>
            <p>{anchor.body}</p>
          </article>
        ))}
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Trip buckets</p>
            <h2>What this planner protects</h2>
          </div>
        </div>
        <div className="bucket-grid">
          {reasonBuckets.map((bucket) => (
            <article key={bucket.title} className="bucket-card">
              <h3>{bucket.title}</h3>
              <div className="mini-tags">
                {bucket.items.map((item) => <span key={item}>{item}</span>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Itinerary comparison</p>
            <h2>Hokkaido or Kyushu</h2>
          </div>
        </div>
        <ComparisonCards branch={branch} setBranch={setBranch} cadToJpy={cadToJpy} />
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function BranchToggle({ branch, setBranch, cadToJpy }: { branch: TripBranch; setBranch: (branch: TripBranch) => void; cadToJpy: number }) {
  return (
    <div className="branch-toggle" role="group" aria-label="Choose final trip extension">
      <button type="button" className={branch === "hokkaido" ? "active" : ""} onClick={() => setBranch("hokkaido")}>
        Hokkaido
        <span>{moneyRange(44000, 79000, 135000, cadToJpy)}</span>
      </button>
      <button type="button" className={branch === "kyushu" ? "active" : ""} onClick={() => setBranch("kyushu")}>
        Kyushu
        <span>{moneyRange(45000, 80000, 139000, cadToJpy)}</span>
      </button>
    </div>
  );
}

function ComparisonCards({ branch, setBranch, cadToJpy }: { branch: TripBranch; setBranch: (branch: TripBranch) => void; cadToJpy: number }) {
  const options = [
    {
      id: "hokkaido" as TripBranch,
      title: "Hokkaido",
      pitch: "Cooler air, Sapporo food, Otaru water, and a more spacious finish.",
      tradeoffs: ["Best weather relief", "More flight-dependent", "Countryside day can run long"],
      cost: [44000, 79000, 135000],
    },
    {
      id: "kyushu" as TripBranch,
      title: "Kyushu",
      pitch: "Fukuoka nights, ramen, onsen-town options, and a warmer southern ending.",
      tradeoffs: ["Food-focused and easy at night", "Warmer and more humid", "Yufuin works better overnight"],
      cost: [45000, 80000, 139000],
    },
  ];

  return (
    <div className="comparison-grid">
      {options.map((option) => (
        <article key={option.id} className={branch === option.id ? "compare-card active" : "compare-card"}>
          <div>
            <p className="eyebrow">Days 25-28</p>
            <h3>{option.title}</h3>
            <p>{option.pitch}</p>
          </div>
          <ul>
            {option.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}
          </ul>
          <div className="compare-footer">
            <span>{moneyRange(option.cost[0], option.cost[1], option.cost[2], cadToJpy)}</span>
            <button type="button" onClick={() => setBranch(option.id)}>
              {branch === option.id ? "Selected" : "Choose"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function ItineraryTimeline({
  activities,
  allActivities,
  cadToJpy,
  updateActivity,
  deleteActivity,
  expandedId,
  setExpandedId,
  brokenImageIds,
  markImageBroken,
}: {
  activities: Activity[];
  allActivities: Activity[];
  cadToJpy: number;
  updateActivity: (id: string, patch: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  brokenImageIds: Set<string>;
  markImageBroken: (id: string) => void;
}) {
  if (!activities.length) return <EmptyState title="No itinerary matches" body="Try clearing a filter or add a custom activity." />;

  return (
    <div className="timeline">
      {days.map((day) => {
        const dayActivities = activities.filter((activity) => activity.day === day);
        const allDayActivities = allActivities.filter((activity) => activity.day === day);
        return (
          <DayColumn
            key={day}
            day={day}
            activities={dayActivities}
            allDayActivities={allDayActivities}
            cadToJpy={cadToJpy}
            updateActivity={updateActivity}
            deleteActivity={deleteActivity}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            brokenImageIds={brokenImageIds}
            markImageBroken={markImageBroken}
          />
        );
      })}
    </div>
  );
}

function DayColumn({
  day,
  activities,
  allDayActivities,
  cadToJpy,
  updateActivity,
  deleteActivity,
  expandedId,
  setExpandedId,
  brokenImageIds,
  markImageBroken,
}: {
  day: number;
  activities: Activity[];
  allDayActivities: Activity[];
  cadToJpy: number;
  updateActivity: (id: string, patch: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  brokenImageIds: Set<string>;
  markImageBroken: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}` });
  const pacing = getDayPacing(allDayActivities);
  const budget = sumBudget(allDayActivities.map((activity) => ({
    low: activity.estimatedCostLow,
    mid: activity.estimatedCostMid,
    high: activity.estimatedCostHigh,
  })));

  return (
    <section ref={setNodeRef} className={isOver ? "day-column is-over" : "day-column"}>
      <div className="day-header">
        <div>
          <p className="eyebrow">Day {day}</p>
          <h2>{allDayActivities[0]?.city ?? "Rest / buffer"}</h2>
        </div>
        <div className={`pacing-pill ${pacing.tone}`}>
          {pacing.tone === "danger" && <TriangleAlert size={15} aria-hidden="true" />}
          {pacing.label}
        </div>
      </div>
      <div className="day-meta">
        <span>{formatJpy(budget.mid)} mid</span>
        <span>{formatCad(budget.mid, cadToJpy)}</span>
        <span>{allDayActivities.length} items</span>
      </div>
      {pacing.tone === "danger" && (
        <p className="warning-copy">This day is likely too packed. Move one item or add a rest block.</p>
      )}
      {activities.length ? (
        <div className="activity-list">
          {activities.map((activity) => (
            <DraggableActivityCard
              key={activity.id}
              activity={activity}
              cadToJpy={cadToJpy}
              updateActivity={updateActivity}
              deleteActivity={deleteActivity}
              expanded={expandedId === activity.id}
              setExpanded={(open) => setExpandedId(open ? activity.id : null)}
              brokenImageIds={brokenImageIds}
              markImageBroken={markImageBroken}
            />
          ))}
        </div>
      ) : (
        <div className="empty-day">
          <CalendarDays size={18} aria-hidden="true" />
          <span>{allDayActivities.length ? "Hidden by filters" : "Open rest space"}</span>
        </div>
      )}
    </section>
  );
}

function DraggableActivityCard(props: ActivityCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: props.activity.id });
  const style = { transform: CSS.Translate.toString(transform) };
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "dragging" : ""}>
      <ActivityCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

interface ActivityCardProps {
  activity: Activity;
  cadToJpy: number;
  updateActivity: (id: string, patch: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  expanded: boolean;
  setExpanded: (open: boolean) => void;
  dragHandleProps?: Record<string, unknown>;
  brokenImageIds: Set<string>;
  markImageBroken: (id: string) => void;
}

function ActivityCard({ activity, cadToJpy, updateActivity, deleteActivity, expanded, setExpanded, dragHandleProps, brokenImageIds, markImageBroken }: ActivityCardProps) {
  const theme = placeholderThemes[Math.abs(activity.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % placeholderThemes.length];
  const hasImage = Boolean(activity.imageUrl && !brokenImageIds.has(activity.id));

  return (
    <article className={`place-card ${activity.isCompleted ? "completed" : ""}`}>
      <div className={hasImage ? "place-media has-image" : "place-media generated"} style={hasImage ? undefined : { background: theme }}>
        {hasImage ? (
          <img
            src={activity.imageUrl}
            alt={activity.imageAlt || activity.title}
            loading="lazy"
            onError={() => markImageBroken(activity.id)}
          />
        ) : (
          <div className="generated-visual" aria-label={activity.imageAlt || `Generated visual for ${activity.title}`}>
            <MapPin size={28} aria-hidden="true" />
            <span>{activity.imageSearchQuery || activity.city}</span>
          </div>
        )}
        <span className="media-overlay">{activity.city}</span>
      </div>
      <div className="place-body">
        <div className="place-title-row">
          <button className="drag-handle" type="button" aria-label={`Drag ${activity.title}`} {...dragHandleProps}>
            <GripVertical size={18} aria-hidden="true" />
          </button>
          <div>
            <p className="eyebrow">Day {activity.day} · {activity.city}</p>
            <h3>{activity.title}</h3>
          </div>
          <button className="icon-button" type="button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Collapse activity" : "Expand activity"}>
            <ChevronDown className={expanded ? "chevron open" : "chevron"} size={19} aria-hidden="true" />
          </button>
        </div>
        <p>{activity.description}</p>
        <div className="meta-chips">
          <span>{activity.category}</span>
          <span>Booking {activity.bookingRequired}</span>
          <span>{activity.energyLevel}</span>
        </div>
        <div className="quick-facts">
          <span><CircleDollarSign size={15} aria-hidden="true" /> {formatJpy(activity.estimatedCostMid)} / {formatCad(activity.estimatedCostMid, cadToJpy)}</span>
          <span><Train size={15} aria-hidden="true" /> {activity.travelTimeFromBase}</span>
        </div>
        <div className="card-actions">
          <button type="button" className={activity.isBooked ? "toggle active" : "toggle"} onClick={() => updateActivity(activity.id, { isBooked: !activity.isBooked })}>
            <BadgeCheck size={16} aria-hidden="true" /> {activity.isBooked ? "Booked" : "Book"}
          </button>
          <button type="button" className={activity.isCompleted ? "toggle active" : "toggle"} onClick={() => updateActivity(activity.id, { isCompleted: !activity.isCompleted })}>
            <CheckCircle2 size={16} aria-hidden="true" /> {activity.isCompleted ? "Done" : "Done"}
          </button>
          <span className="budget-mini">{activity.visitDuration} · Priority {activity.priority}</span>
        </div>

        {expanded && (
          <div className="expanded-panel">
            <div className="detail-grid">
              <InfoTile icon={<CircleDollarSign size={17} />} label="Rough budget" value={moneyRange(activity.estimatedCostLow, activity.estimatedCostMid, activity.estimatedCostHigh, cadToJpy)} />
              <InfoTile icon={<Train size={17} />} label="Travel from base" value={activity.travelTimeFromBase} />
              <InfoTile icon={<CloudRain size={17} />} label="Weather backup" value={activity.weatherSensitive ? activity.backupOption : "Not weather-sensitive"} />
              <InfoTile icon={<MapIcon size={17} />} label="Maps query" value={activity.googleMapsQuery} />
            </div>
            {(activity.imageCredit || activity.imageSearchQuery) && (
              <div className="image-credit">
                {activity.imageCredit ? (
                  <span>
                    Image: {activity.imageCreditUrl ? <a href={activity.imageCreditUrl} target="_blank" rel="noreferrer">{activity.imageCredit}</a> : activity.imageCredit}
                    {activity.imageLicense ? ` · ${activity.imageLicense}` : ""}
                  </span>
                ) : (
                  <span>Generated visual placeholder · Replace later with: {activity.imageSearchQuery}</span>
                )}
              </div>
            )}
            <div className="editor-grid">
              <label className="field">
                <span>Title</span>
                <input value={activity.title} onChange={(event) => updateActivity(activity.id, { title: event.target.value })} />
              </label>
              <label className="field">
                <span>City</span>
                <input value={activity.city} onChange={(event) => updateActivity(activity.id, { city: event.target.value })} />
              </label>
              <label className="field">
                <span>Move to day</span>
                <select value={activity.day} onChange={(event) => updateActivity(activity.id, { day: Number(event.target.value) })}>
                  {days.map((day) => <option key={day} value={day}>Day {day}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Category</span>
                <select value={activity.category} onChange={(event) => updateActivity(activity.id, { category: event.target.value as Category })}>
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Low JPY</span>
                <input type="number" value={activity.estimatedCostLow} onChange={(event) => updateActivity(activity.id, { estimatedCostLow: Number(event.target.value) })} />
              </label>
              <label className="field">
                <span>Mid JPY</span>
                <input type="number" value={activity.estimatedCostMid} onChange={(event) => updateActivity(activity.id, { estimatedCostMid: Number(event.target.value) })} />
              </label>
              <label className="field">
                <span>High JPY</span>
                <input type="number" value={activity.estimatedCostHigh} onChange={(event) => updateActivity(activity.id, { estimatedCostHigh: Number(event.target.value) })} />
              </label>
              <label className="field">
                <span>Duration hours</span>
                <input type="number" step="0.5" value={activity.durationHours} onChange={(event) => updateActivity(activity.id, { durationHours: Number(event.target.value) })} />
              </label>
              <label className="field wide">
                <span>Notes</span>
                <textarea value={activity.notes} placeholder="Add personal notes, booking numbers, food ideas" onChange={(event) => updateActivity(activity.id, { notes: event.target.value })} />
              </label>
              <label className="field wide">
                <span>Logistics notes</span>
                <textarea value={activity.logisticsNotes} onChange={(event) => updateActivity(activity.id, { logisticsNotes: event.target.value })} />
              </label>
            </div>
            <div className="expanded-actions">
              <button type="button" className="danger-button" onClick={() => deleteActivity(activity.id)}>
                <Trash2 size={16} aria-hidden="true" /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="info-tile">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PlaceBrowser(props: Omit<ActivityCardProps, "activity" | "expanded" | "setExpanded"> & {
  activities: Activity[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  brokenImageIds: Set<string>;
  markImageBroken: (id: string) => void;
}) {
  if (!props.activities.length) return <EmptyState title="No places found" body="The current filters do not match any place cards." />;
  return (
    <div className="place-grid">
      {props.activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          cadToJpy={props.cadToJpy}
          updateActivity={props.updateActivity}
          deleteActivity={props.deleteActivity}
          expanded={props.expandedId === activity.id}
          setExpanded={(open) => props.setExpandedId(open ? activity.id : null)}
          brokenImageIds={props.brokenImageIds}
          markImageBroken={props.markImageBroken}
        />
      ))}
    </div>
  );
}

function BudgetDashboard({
  activities,
  budget,
  cadToJpy,
  stayAreas,
  setStayAreas,
  branch,
}: {
  activities: Activity[];
  budget: ReturnType<typeof useAppBudget>;
  cadToJpy: number;
  stayAreas: typeof defaultStayAreas;
  setStayAreas: React.Dispatch<React.SetStateAction<typeof defaultStayAreas>>;
  branch: TripBranch;
}) {
  const categoryRows = Object.entries(budget.categories);
  const cityRows = Object.entries(budget.byCity).sort((a, b) => b[1].mid - a[1].mid);

  function updateStay(id: string, key: "estimatedLowPerNight" | "estimatedMidPerNight" | "estimatedHighPerNight", value: number) {
    setStayAreas((current) => current.map((stay) => (stay.id === id ? { ...stay, [key]: value } : stay)));
  }

  return (
    <div className="view-stack">
      <section className="budget-hero">
        <Stat label="Low estimate" value={formatJpy(budget.total.low)} note={formatCad(budget.total.low, cadToJpy)} />
        <Stat label="Mid estimate" value={formatJpy(budget.total.mid)} note={formatCad(budget.total.mid, cadToJpy)} />
        <Stat label="High estimate" value={formatJpy(budget.total.high)} note={formatCad(budget.total.high, cadToJpy)} />
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Rough estimate by category</p>
            <h2>Trip budget dashboard</h2>
          </div>
          <CircleDollarSign size={21} aria-hidden="true" />
        </div>
        <div className="budget-bars">
          {categoryRows.map(([label, values]) => (
            <div className="budget-row" key={label}>
              <div>
                <strong>{label}</strong>
                <span>{formatCad(values.mid, cadToJpy)} mid</span>
              </div>
              <div className="bar-track">
                <span style={{ width: `${Math.max(8, (values.mid / budget.total.mid) * 100)}%` }} />
              </div>
              <b>{formatJpy(values.mid)}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="split-grid">
        <div className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">By city / region</p>
              <h2>Activity spend</h2>
            </div>
          </div>
          <div className="compact-list">
            {cityRows.map(([city, values]) => (
              <div key={city}>
                <span>{city}</span>
                <strong>{formatJpy(values.mid)} / {formatCad(values.mid, cadToJpy)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Special experiences</p>
              <h2>Budget callouts</h2>
            </div>
          </div>
          <div className="compact-list">
            {specialExperiences.map((experience) => (
              <div key={experience.id}>
                <span>{experience.title}</span>
                <strong>{moneyRange(experience.estimatedLow, experience.estimatedMid, experience.estimatedHigh, cadToJpy)}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Stay areas</p>
            <h2>Edit lodging assumptions</h2>
          </div>
          <Hotel size={21} aria-hidden="true" />
        </div>
        <div className="stay-grid">
          {stayAreas.map((stay) => (
            <article className="stay-card" key={stay.id}>
              <p className="eyebrow">{stay.days}</p>
              <h3>{stay.city}: {stay.area}</h3>
              <p>{stay.note}</p>
              <div className="three-inputs">
                {([
                  ["Low", "estimatedLowPerNight"],
                  ["Mid", "estimatedMidPerNight"],
                  ["High", "estimatedHighPerNight"],
                ] as Array<[string, "estimatedLowPerNight" | "estimatedMidPerNight" | "estimatedHighPerNight"]>).map(([label, key]) => (
                  <label className="field" key={key}>
                    <span>{label} / night</span>
                    <input type="number" value={stay[key]} onChange={(event) => updateStay(stay.id, key, Number(event.target.value))} />
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Route transport</p>
            <h2>{branch === "hokkaido" ? "Hokkaido" : "Kyushu"} active route</h2>
          </div>
        </div>
        <div className="compact-list">
          {routeMoves.filter((move) => !move.branch || move.branch === branch).map((move) => (
            <div key={move.id}>
              <span>{move.from} to {move.to} · Day {move.day} · {move.duration}</span>
              <strong>{moneyRange(move.estimatedLow, move.estimatedMid, move.estimatedHigh, cadToJpy)}</strong>
            </div>
          ))}
        </div>
      </section>
      <p className="fine-print">Activity count in this budget: {activities.length}. All numbers are rough planning estimates and should be edited as bookings become real.</p>
    </div>
  );
}

function MapsExport({
  activities,
  allActivities,
  cadToJpy,
  copyText,
  downloadCsv,
}: {
  activities: Activity[];
  allActivities: Activity[];
  cadToJpy: number;
  copyText: (text: string) => Promise<void>;
  downloadCsv: (exportActivities?: Activity[]) => void;
}) {
  const rows = makeExportRows(activities);
  const allRows = makeExportRows(allActivities);
  const grouped = categories.map((category) => ({
    category,
    rows: rows.filter((row) => row.category === category),
  }));

  if (!activities.length) return <EmptyState title="No export rows" body="Clear filters to export the full Google Maps list." />;

  return (
    <div className="view-stack">
      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Google Maps ready</p>
            <h2>Copy lists or export CSV</h2>
          </div>
          <div className="button-row">
            <button className="ghost-button" type="button" onClick={() => copyText(rowsToCsv(allRows))}>
              <Clipboard size={17} aria-hidden="true" /> Export all
            </button>
            <button className="primary-button" type="button" onClick={() => downloadCsv(allActivities)}>
              <Download size={17} aria-hidden="true" /> CSV
            </button>
          </div>
        </div>
        <p className="fine-print">Rows include place name, city, Google Maps search query, category, priority, note, duration, and rough JPY budget with CAD shown on cards.</p>
      </section>

      {grouped.map(({ category, rows: categoryRows }) => (
        <section className="card export-section" key={category}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{categoryRows.length} places</p>
              <h2>{category}</h2>
            </div>
            <button className="ghost-button" type="button" onClick={() => copyText(rowsToCsv(categoryRows))} disabled={!categoryRows.length}>
              <Clipboard size={17} aria-hidden="true" /> Copy
            </button>
          </div>
          {categoryRows.length ? (
            <div className="export-list">
              {categoryRows.map((row) => (
                <article key={`${row.place}-${row.city}`}>
                  <strong>{row.place}</strong>
                  <span>{row.city} · Priority {row.priority} · {row.duration}</span>
                  <p>{row.note}</p>
                  <small>{row.query} · {row.budget} · {formatCad(Number(row.budget.split("-")[1].replace(" JPY", "")), cadToJpy)} high</small>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing in this category" body="Move an activity into this category or clear the active filters." compact />
          )}
        </section>
      ))}
    </div>
  );
}

function EmptyState({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) {
  return (
    <section className={compact ? "empty-state compact" : "empty-state"}>
      <MapPin size={compact ? 20 : 28} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}

export default App;
