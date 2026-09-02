import { useState } from "react";
import type { Trip, TripActivity, RouteSuggestion } from "./tripTypes";
import {
  Bot,
  Clipboard,
  CloudRain,
  Download,
  Import,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

export default function MorePanel({
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

function AssistantPanel({ trip, activities, routeSuggestions }: { trip: Trip; activities: TripActivity[]; routeSuggestions: RouteSuggestion[] }) {
  const [activePrompt, setActivePrompt] = useState("make this day lighter");
  const rainy = activities.filter((activity) => /rain|weather|boat|mountain|outdoor|hike/i.test(`${activity.description} ${activity.notes} ${activity.title}`)).slice(0, 5);
  const cheaper = activities.filter((activity) => activity.estimatedCost > (trip.currency === "JPY" ? 12000 : 100)).slice(0, 5);
  const foodCount = activities.filter((activity) => activity.type === "food" || activity.category === "Food").length;
  const promptCopy: Record<string, string> = {
    "make this day lighter": "Look at the warning cards below and move one optional or low-priority stop out of any crowded day.",
    "optimize this route": "Use the route preview and day chips to keep each day anchored around one city or base. The suggestions use the saved itinerary and do not call a live routing service.",
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
          <h2>Trip helper</h2>
        </div>
        <Bot size={22} aria-hidden="true" />
      </div>
      <p>These suggestions use local rules based on the current itinerary. Nothing is sent to an AI service.</p>
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

      {isPeru && <div className="source-note"><h3>Peru source status</h3><p>Public Wanderlog state plus the local Wanderlog PDF are imported: 55 dated cards, exact PDF route-leg timings, 16 daily route summaries, 4 flights, 10 lodging blocks, 2 train/transit blocks, and 19 CAD expenses. Add more Google Doc notes here only if the doc changes later.</p></div>}
      {isPortugal && <div className="source-note"><h3>Portugal source status</h3><p>The Google Docs PDF and Wanderlog PDF are imported: 17 dated days, booked flights, booked lodging, Wanderlog route timing text, CAD/EUR expenses, Portugal map rows, and the remaining booking checklist.</p></div>}

      <div className="textarea-grid">
        <label className="field"><span>Paste Wanderlog text or JSON</span><textarea value={wanderlogText} onChange={(event) => setWanderlogText(event.target.value)} placeholder="Paste Wanderlog export here" /></label>
        <label className="field"><span>Paste Google Doc notes</span><textarea value={googleDocText} onChange={(event) => setGoogleDocText(event.target.value)} placeholder="Add Google Doc note" /></label>
      </div>

      <div className="maps-toolbar">
        <button className="ghost-button" type="button" onClick={previewPaste}><Clipboard size={17} /> Preview pasted notes</button>
        <button className="primary-button" type="button" onClick={downloadBackup}><Download size={17} /> Export JSON backup</button>
      </div>

      <label className="field"><span>Restore from JSON backup</span><textarea value={backupText} onChange={(event) => setBackupText(event.target.value)} placeholder={`Paste a ${trip.id} JSON backup here`} /></label>
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
  return <div className="suggestion-list">{suggestions.map((suggestion) => <article className={`suggestion-card ${suggestion.severity}`} key={suggestion.id}>{suggestion.severity === "warning" ? <TriangleAlert size={18} aria-hidden="true" /> : <CloudRain size={18} aria-hidden="true" />}<div><h3>{suggestion.title}</h3><p>{suggestion.detail}</p></div></article>)}</div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="empty-state"><Sparkles size={20} aria-hidden="true" /><h3>{title}</h3><p>{body}</p></div>;
}
