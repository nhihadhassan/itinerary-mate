# Itinerary Mate

**Live demo:** https://itinerary-mate.vercel.app

Itinerary Mate is a local-first multi-trip itinerary tracker built with Vite, React, and TypeScript — a travel command center with editable day-by-day cards, multi-currency budget dashboards, flight/lodging tracking, OpenStreetMap previews, CSV export, dark mode, and offline PWA support. It currently includes:

- Japan Trip: the original September 1-30, 2026 planner with JPY source budgets and CAD comparison.
- Peru Trip: a July 11-26, 2026 Wanderlog import enriched from the local Wanderlog PDF, with 55 dated cards, exact route-leg timing text, 16 daily route summaries, 4 flights, 10 lodging blocks, 2 train/transit blocks, 19 imported CAD expenses, and PEN + CAD planning displays.
- Portugal Trip: a June 8-24, 2026 mainland Portugal plan imported from the local Google Docs PDF and Wanderlog PDF, with Lisbon, Lagos, Sintra, Porto, Douro Valley, booked flights, booked lodging, route timing text, map rows, calendar view, and EUR + CAD budgeting.

The app is designed as a travel command center: editable cards, budget dashboards, lodging and flight tracking, attachment placeholders, route suggestions, OpenStreetMap-based map previews, CSV export, dark mode, and offline-ready PWA basics.

## Run Locally

```bash
pnpm install
pnpm dev
```

Open the local URL Vite prints, usually:

```text
http://127.0.0.1:5173/
```

## Build

```bash
pnpm build
```

Vite writes the production site to:

```text
dist/
```

Preview the production build locally:

```bash
pnpm preview
```

## Project Structure

- `src/App.tsx`: multi-trip app shell, localStorage migration, trip switcher, dashboards, exports, logistics, dark mode, and editing UI.
- `src/japanItinerary.ts`: Japan source itinerary and original budget route data.
- `src/peruItinerary.ts`: Peru trip seed data, flights, hotels, attachments, and route suggestions.
- `src/portugalItinerary.ts`: Portugal trip seed data from the Google Docs PDF and Wanderlog PDF, including flights, hotels, activities, attachments, route summaries, and region calendar blocks.
- `src/lib/placeParsing.ts`: Google Maps URL parsing helpers adapted from the MIT-licensed `Dobidop/easyItinerary` reference.
- `src/lib/openMapServices.ts`: future-ready wrappers for free/open POI and routing services: Photon, Nominatim, Overpass, and OSRM.
- `src/tripTypes.ts`: shared trip, activity, flight, hotel, attachment, and route suggestion types.
- `src/importTemplates/peruWanderlogTemplate.ts`: paste-ready format for adding more Peru details from Wanderlog, Google Docs, emails, or notes.
- `docs/easyItinerary-reference.md`: downloaded reference inventory for useful EasyItinerary functions and future adaptation notes.
- `public/manifest.webmanifest`, `public/sw.js`, `public/icon.svg`: installable PWA shell and core asset caching.

## Peru Import Workflow

The Google Doc source previously redirected document export to Google sign-in. A locally exported Wanderlog/Google Doc PDF provides the same detailed trip information and is used for route-leg timings, daily route summaries, opening-hour notes, flights, hotels, transit, and expenses.

You can use the in-app **Import** tab to:

1. Paste Wanderlog text or JSON for preview.
2. Paste Google Doc notes after exporting or copying them manually if the doc changes after the PDF.
3. Export a JSON backup of the active trip.
4. Restore a JSON backup only after explicit confirmation.

The code template in `src/importTemplates/peruWanderlogTemplate.ts` remains available for structured manual imports with day, date, place, address, travel time, cost, flight details, hotel details, notes, attachments, and coordinates.

Keep private documents out of localStorage. Attachment records are metadata only for now.

## Currency

- Japan uses JPY as the source currency and CAD as the comparison currency.
- Peru uses PEN as the local trip currency and CAD as the comparison currency.
- Portugal uses EUR as the local trip currency and CAD as the comparison currency.
- Peru's public Wanderlog expenses were imported in CAD, then converted to rough PEN using the editable planning rate `1 CAD = 2.5 PEN`.
- Portugal's booked lodging was imported in EUR. Flight/activity expenses from Wanderlog that were listed in CAD are converted to rough EUR using the editable planning rate `1 CAD = 0.65 EUR`.
- Exchange rates are planning estimates, not live financial quotes.

## Offline And PWA Notes

The app registers a simple service worker in production builds. It caches the core app shell and same-origin files so saved localStorage edits remain available offline.

Limitations:

- External images may not load offline unless already cached by the browser.
- Route optimization is heuristic only.
- Flight statuses are manual and not live.
- The AI Assistant panel uses local rules only and does not call paid AI APIs.
- Attachments are local metadata placeholders, not secure file storage.

## Open Map Services

Itinerary Mate no longer loads the Google Maps JavaScript API. Maps and future POI enrichment are designed around free/open services:

- OpenStreetMap raster tiles for map previews.
- Photon and Nominatim for place search/geocoding.
- Overpass for public OSM place tags such as website, hours, phone, cuisine, and address when available.
- OSRM for rough route estimates when coordinates exist.

These services are not a replacement for Google Places review/rating data. Public endpoints can be rate-limited or unavailable, so the app keeps saved itinerary data local and treats live POI enrichment as optional.

## Deploy To Vercel

Recommended path: GitHub + Vercel dashboard.

1. Push this project to GitHub.
2. In Vercel, choose **Add New Project**.
3. Import the GitHub repository.
4. Use these settings:
   - Framework preset: `Vite`
   - Install command: `pnpm install`
   - Build command: `pnpm build`
   - Output directory: `dist`
5. Deploy.
6. Open the live Vercel URL on your phone.

The repo includes `vercel.json` with the Vite build settings.

## QA Checklist

- Run `pnpm build`.
- Check Japan and Peru tabs.
- Confirm Japan branch switching still works.
- Edit an activity note or cost, refresh, and confirm localStorage persistence.
- Toggle dark mode and refresh.
- Confirm open map copy export and CSV export for both trips.
- Check desktop, tablet, and 375px mobile widths for horizontal overflow.
- Confirm production build has `manifest.webmanifest` and service worker registration.
- Open the deployed Vercel URL on a phone.

## License

Released under the [MIT License](LICENSE).
