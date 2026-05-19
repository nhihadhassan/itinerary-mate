# Itinerary Mate

Itinerary Mate is a local-first multi-trip itinerary tracker built with Vite, React, and TypeScript. It currently includes:

- Japan Trip: the original September 1-30, 2026 planner with JPY source budgets and CAD comparison.
- Peru Trip: a July 11-26, 2026 seed itinerary based on the public Wanderlog plan, including Cusco, the Sacred Valley, Machu Picchu, Arequipa, Colca Canyon, Paracas, Huacachina, Lima, flights, hotels, and rough CAD costs.

The app is designed as a travel command center: editable cards, budget dashboards, lodging and flight tracking, attachment placeholders, route suggestions, Google Maps export, CSV export, dark mode, and offline-ready PWA basics.

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
- `src/tripTypes.ts`: shared trip, activity, flight, hotel, attachment, and route suggestion types.
- `src/importTemplates/peruWanderlogTemplate.ts`: paste-ready format for adding more Peru details from Wanderlog, Google Docs, emails, or notes.
- `public/manifest.webmanifest`, `public/sw.js`, `public/icon.svg`: installable PWA shell and core asset caching.

## Peru Import Workflow

The Google Doc source may require sign-in, so the current Peru seed uses the publicly readable Wanderlog state. To add more exact notes later:

1. Open `src/importTemplates/peruWanderlogTemplate.ts`.
2. Paste each real item into the template shape: day, date, place, address, travel time, cost, flight details, hotel details, notes, attachments, and coordinates.
3. Convert the pasted items into `TripActivity` records in `src/peruItinerary.ts`.
4. Keep private documents out of localStorage. Attachment records are metadata only for now.

## Offline And PWA Notes

The app registers a simple service worker in production builds. It caches the core app shell and same-origin files so saved localStorage edits remain available offline.

Limitations:

- External images may not load offline unless already cached by the browser.
- Route optimization is heuristic only.
- Flight statuses are manual and not live.
- The AI Assistant panel uses local rules only and does not call paid AI APIs.
- Attachments are local metadata placeholders, not secure file storage.

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
- Confirm Google Maps copy export and CSV export for both trips.
- Check desktop, tablet, and 375px mobile widths for horizontal overflow.
- Confirm production build has `manifest.webmanifest` and service worker registration.
- Open the deployed Vercel URL on a phone.
