# September Japan Itinerary Planner

An editable one-month Japan trip planner for September 2026. It includes a day-by-day itinerary, rough JPY/CAD budgets, pacing warnings, Hokkaido vs Kyushu comparison, stay-area planning, Google Maps export, CSV export, and visual place cards with safe Wikimedia Commons photos or generated fallbacks.

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

## Deploy To Vercel

Recommended path: GitHub + Vercel dashboard.

1. Create a new GitHub repository.
2. Push this local project to GitHub.
3. In Vercel, choose **Add New Project**.
4. Import the GitHub repository.
5. Use these settings:
   - Framework preset: `Vite`
   - Install command: `pnpm install`
   - Build command: `pnpm build`
   - Output directory: `dist`
6. Deploy.
7. Open the live Vercel URL on your phone.

Vercel usually detects Vite automatically, but keep the settings above if anything looks off.

## Manual Photo Replacement

Each activity in `src/japanItinerary.ts` supports:

- `imageUrl`
- `imageAlt`
- `imageCredit`
- `imageCreditUrl`
- `imageLicense`
- `imageSearchQuery`

Use `imageUrl` for safe, stable image URLs. If it is empty or fails to load, the app shows a generated scenic fallback card.

## QA Checklist

- Run `pnpm build`.
- Check the site at desktop, tablet, and mobile widths.
- Confirm there is no horizontal overflow on mobile.
- Confirm image cards render or show clean generated fallbacks.
- Edit a budget and refresh to confirm localStorage persistence.
- Check the Budget dashboard after editing costs.
- Use Google Maps copy export.
- Download the CSV export and confirm commas/quotes are preserved.
- Open the deployed Vercel URL on a phone.
