import { Link } from "react-router-dom";
import { ArrowRight, Compass, MapPin } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="not-found-shell">
      <main className="not-found-page" aria-labelledby="not-found-title">
        <div className="not-found-route" aria-hidden="true">
          <span className="not-found-pin start"><MapPin size={18} /></span>
          <span className="not-found-route-line" />
          <span className="not-found-pin end"><Compass size={20} /></span>
        </div>
        <p className="eyebrow">Itinerary Mate · 404</p>
        <h1 id="not-found-title">Looks like this trip went off route.</h1>
        <p className="not-found-copy">We couldn’t find that itinerary or page. The route may have changed, or the link may be incomplete.</p>
        <div className="button-row not-found-actions">
          <Link className="primary-button" to="/">Go home <ArrowRight size={17} aria-hidden="true" /></Link>
          <Link className="ghost-link-button" to="/explore">Explore itineraries</Link>
        </div>
      </main>
    </div>
  );
}
