import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import App from "./App";
import NotFoundPage from "./NotFoundPage";
import { metadataForRoute } from "./metadata";
import { applyMetadata } from "./metadataClient";
import { routeForPath } from "./routeManifest";
import "./styles.css";

function AppRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = routeForPath(location.pathname);

  React.useEffect(() => {
    applyMetadata(
      route
        ? metadataForRoute(route)
        : {
            ...metadataForRoute({
              path: "/",
              view: "dashboard",
              tripId: "japan-2026",
              indexable: false,
              title: "Page not found | Itinerary Mate",
              description: "The requested Itinerary Mate page could not be found.",
            }),
            canonical: "https://itinerary-mate.vercel.app/",
            robots: "noindex,nofollow",
          },
    );
  }, [location.pathname, route]);

  return route ? <App route={route} navigate={navigate} /> : <NotFoundPage />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  </React.StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent("itinerary-mate-update-ready"));
            }
          });
        });
      })
      .catch(() => {
        // Non-blocking: the app still works if a browser refuses service worker registration.
      });
  });
}
