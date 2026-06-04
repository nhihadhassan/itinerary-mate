# easyItinerary Reference Notes

Source downloaded for reference:

- Site: https://dobidop.github.io/easyItinerary/
- Repo: https://github.com/Dobidop/easyItinerary
- Local reference copy: `/Users/nhihad/Documents/easyItinerary-reference`
- License: MIT, copyright Dobidop 2026

The reference app is a vanilla HTML/CSS/JavaScript itinerary planner. It should not be copied wholesale into Itinerary Mate because our app is Vite + React + TypeScript, but several functions and interaction patterns are useful to adapt.

## Most Useful Features To Port

1. **Google Maps URL parsing**
   - Source: `js/resources.js`
   - Functions: `isGoogleMapsUrl`, `extractGoogleMapsData`, `extractGoogleMapsCoords`
   - Why useful: lets a user paste a Google Maps URL and recover a place name plus coordinates when the URL includes `!3d!4d`, `@lat,lng`, `q=lat,lng`, or `/place/...`.

2. **Place search and geocoding fallback**
   - Source: `js/map.js`, `js/resources.js`
   - Functions/patterns: Photon first, Nominatim fallback, location bias from existing trip coordinates.
   - Why useful: supports adding places without a paid API key. Good fallback even if Google Places is not configured.

3. **OSM place detail enrichment**
   - Source: `js/resources.js`
   - Functions: `reverseGeocode`, `resolveCityFromCoords`, `fetchPlaceDetails`
   - Why useful: can fill city, address, phone, hours, cuisine, and website from Nominatim/Overpass where data exists.

4. **Route gap estimates**
   - Source: `js/itinerary.js`
   - Functions: `haversineKm`, `daySpreadKm`, `dayLoadLevel`, `fetchOsrmSegment`, `formatOsrmGap`, `updateOsrmGaps`
   - Why useful: gives no-key route timing estimates via OSRM and a fallback pacing signal from activity count/spread.

5. **Numbered markers and route lines**
   - Source: `js/map.js`
   - Functions: `createMarkerIcon`, `updateMarkers`, `drawRouteLine`, `fitBounds`
   - Why useful: matches Itinerary Mate's Wanderlog-style numbered route UI. The idea should be adapted into our React map components rather than copied as Leaflet globals.

6. **Resources / shortlist workflow**
   - Source: `js/resources.js`
   - Functions/patterns: selected vs potential resources, `addResourceToDay`, `syncFromResources`
   - Why useful: good fit for Japan Explore and future Discovery boards: save ideas first, then add them to a day later.

7. **Backup and sharing patterns**
   - Source: `js/storage.js`, `server.js`
   - Functions: `exportTrip`, `importTrip`, `shareTrip`, `loadSharedTrip`, sync polling
   - Why useful: our app already has localStorage and JSON backup; the share pattern is useful later if we add a server or Supabase sync.

## Recommended Itinerary Mate Adaptation Order

1. Add a TypeScript utility module for map/place parsing:
   - `src/lib/placeParsing.ts`
   - Include MIT attribution comment if code is closely adapted.
   - Expose `parseGoogleMapsUrl`, `isGoogleMapsUrl`, and coordinate sanity helpers.

2. Add optional no-key geocoding helpers:
   - `src/lib/geocoding.ts`
   - Photon and Nominatim fetch wrappers with abort timeouts and gentle rate limits.
   - Keep this client-side and clearly label it as external live data that may fail offline.

3. Improve Add Place / Explore:
   - Let pasted Google Maps links prefill title, address/search query, latitude, longitude, and category guess.
   - Add a selected/potential status for research boards.

4. Improve route timings:
   - Add OSRM estimates only when coordinates exist.
   - Cache estimates in localStorage so repeated views do not hammer the demo server.
   - Keep routing clearly labeled as estimated unless a dedicated routing provider is configured later.

5. Defer sharing server:
   - `easyItinerary` uses a small Node server storing JSON files locally.
   - Itinerary Mate is static on Vercel; sharing should be done later with Supabase/Vercel storage, not copied directly.

## Important Notes

- Do not use `easyItinerary` CDN dependencies blindly. It uses Leaflet, Font Awesome, CARTO tiles, Photon, Nominatim, Overpass, OSRM, and Open-Meteo.
- Nominatim and OSRM public endpoints have fair-use expectations. Rate-limit requests and cache results.
- Google Maps short-link resolution in `server.js` requires a server endpoint; static Vercel cannot resolve short links safely without adding an API route. The current app can still parse full Google Maps URLs, but it does not load the Google Maps API.
- The MIT license permits reuse, but copied/adapted substantial code should retain the copyright/license notice.
