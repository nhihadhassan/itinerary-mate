export const peruWanderlogPasteFormat = `# Paste Peru itinerary data here

Use this format when copying from Wanderlog, Google Docs, email confirmations, or notes.
Keep one activity per block. Blank fields are fine.

Trip:
- title: Peru Trip
- startDate: 2026-07-11
- endDate: 2026-07-26
- localCurrency: PEN
- comparisonCurrency: CAD
- source: Wanderlog PDF, Wanderlog, or Google Doc

Day:
- day: 1
- date: 2026-07-11
- dayTitle: Toronto to Cusco

Activity:
- title:
- city:
- country: Peru
- category: Must See | Non-Negotiable | Nice To Have | Extra | Flight | Hotel | Food | Transit | Note
- address:
- googleMapsQuery:
- latitude:
- longitude:
- startTime:
- endTime:
- duration:
- travelTimeFromPrevious:
- routeLegEstimate:
- dayRouteSummary:
- transportMode:
- estimatedCost:
- localCurrencyCode: PEN
- costCad:
- costStatus: imported | converted-estimate | needs-confirmation | manual
- bookingReference:
- notes:
- imageUrl:
- imageAlt:
- priority: 1
- isBooked: false
- isCompleted: false
- attachmentIds:

Flight details, if this is a flight:
- airline:
- flightNumber:
- departureAirport:
- arrivalAirport:
- departureTime:
- arrivalTime:
- confirmation:
- status: manual / not live yet

Hotel details, if this is lodging:
- hotelName:
- checkIn:
- checkOut:
- address:
- estimatedCost:
- confirmation:

Attachment metadata, local-only for now:
- fileName:
- type: ticket | booking | screenshot | pdf | note | other
- note:
- url:
- localReference:

Important:
- Do not paste passport scans, visa scans, or private IDs into localStorage.
- Live routing, live flight updates, and AI calls are intentionally not connected yet.
- Google Doc content can be pasted into this format if it changes after the Wanderlog PDF.`;

export const peruWanderlogExample = {
  day: 5,
  date: "2026-07-15",
  dayTitle: "Machu Picchu",
  activity: {
    title: "Historic Sanctuary of Machu Picchu",
    city: "Aguas Calientes",
    country: "Peru",
    category: "Non-Negotiable",
    address: "08680, Peru",
    googleMapsQuery: "Historic Sanctuary of Machu Picchu, Peru",
    latitude: -13.1631988,
    longitude: -72.5452621,
    startTime: "",
    endTime: "",
    duration: "3-4 hr",
    travelTimeFromPrevious: "15 min · 3.7 mi from Hotel INKA'S LAND",
    routeLegEstimate: "15 min · 3.7 mi from Hotel INKA'S LAND",
    transportMode: "bus + walk",
    estimatedCost: 330.75,
    localCurrencyCode: "PEN",
    costCad: 132.3,
    bookingReference: "Paste reference here",
    notes: "Wanderlog PDF: Open 6:30AM-3:45PM. Go early and keep the rest of the day flexible.",
    attachmentIds: ["peru-machu-ticket"],
  },
};
