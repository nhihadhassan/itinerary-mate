export type TripId = "japan-2026" | "peru-2026" | "portugal-2026";
export type TripCurrency = "JPY" | "CAD" | "PEN" | "USD" | "EUR";
export type TripActivityType = "activity" | "food" | "hotel" | "flight" | "transport" | "note";
export type TripSource = "japan-default" | "Wanderlog" | "Wanderlog PDF" | "Google Doc" | "Google Doc PDF" | "manual" | "placeholder" | "needs confirmation";
export type CostStatus = "imported" | "converted-estimate" | "needs-confirmation" | "manual";
export type BookingStatus = "booked" | "not-booked" | "optional" | "needs-confirmation";
export type ActualVisitStatus = "visited" | "unconfirmed" | "skipped";
export type ActualVisitEvidence = "expense" | "dated-itinerary" | "manual";
export type ActualExpenseCategory = "flight" | "lodging" | "food" | "drinks" | "groceries" | "activity" | "sightseeing" | "transport" | "shopping" | "other";
export type TripCategory =
  | "Must See"
  | "Non-Negotiable"
  | "Nice To Have"
  | "Extra"
  | "Flight"
  | "Hotel"
  | "Food"
  | "Transit"
  | "Attachment"
  | "Note";

export interface TripActivity {
  id: string;
  tripId: TripId;
  day: number;
  date?: string;
  city: string;
  region?: string;
  country: string;
  title: string;
  type?: TripActivityType;
  description: string;
  category: TripCategory;
  address?: string;
  googleMapsQuery: string;
  latitude?: number;
  longitude?: number;
  startTime?: string;
  endTime?: string;
  duration: string;
  travelTimeFromPrevious?: string;
  transportMode?: string;
  estimatedCost: number;
  estimatedCostLow?: number;
  estimatedCostMid?: number;
  estimatedCostHigh?: number;
  currency: TripCurrency;
  costLocal?: number;
  localCurrencyCode?: TripCurrency;
  costCad?: number;
  costCategory?: "flight" | "hotel" | "food" | "activity" | "transport" | "misc";
  costStatus?: CostStatus;
  bookingStatus?: BookingStatus;
  bookingReference?: string;
  confirmationReference?: string;
  flightInfo?: TripFlight;
  hotelInfo?: TripHotel;
  attachmentIds: string[];
  notes: string;
  imageUrl: string;
  imageAlt?: string;
  imageCredit?: string;
  imageCreditUrl?: string;
  imageLicense?: string;
  imageSearchQuery?: string;
  priority: number;
  isBooked: boolean;
  isCompleted: boolean;
  source?: TripSource;
  sourceId?: string;
  sourceUrl?: string;
  needsConfirmationReasons?: string[];
  routeLegEstimate?: string;
  isRouteEstimate?: boolean;
  branch?: string;
}

export interface TripFlight {
  id: string;
  tripId: TripId;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  confirmation?: string;
  status: "manual / not live yet" | "booked" | "pending" | "completed" | "cancelled";
  notes?: string;
  costCad?: number;
  costLocal?: number;
  localCurrencyCode?: TripCurrency;
  source?: TripSource;
  sourceId?: string;
}

export interface TripHotel {
  id: string;
  tripId: TripId;
  name: string;
  city: string;
  country: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
  estimatedCost: number;
  currency: TripCurrency;
  costCad?: number;
  costLocal?: number;
  localCurrencyCode?: TripCurrency;
  costStatus?: CostStatus;
  source?: TripSource;
  sourceId?: string;
  confirmation?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export interface TripCurrencyConfig {
  localCurrency: TripCurrency;
  comparisonCurrency: "CAD";
  localPerCad: number;
  label: string;
  isEstimate: boolean;
}

export interface TripAttachment {
  id: string;
  tripId: TripId;
  activityId?: string;
  fileName: string;
  type: "ticket" | "booking" | "screenshot" | "pdf" | "note" | "other";
  note: string;
  url?: string;
  localReference?: string;
  isSensitivePlaceholder?: boolean;
}

export interface RouteSuggestion {
  id: string;
  tripId: TripId;
  day?: number;
  city?: string;
  severity: "info" | "warning";
  title: string;
  detail: string;
}

export interface ActualExpense {
  id: string;
  tripId: TripId;
  date: string;
  merchant: string;
  category: ActualExpenseCategory;
  amount: number;
  currency: "CAD" | "EUR";
  cadEquivalent: number;
  city: string;
  visitId?: string;
  payer?: string;
  personalShareCad?: number;
  isShared?: boolean;
  source: "Wanderlog PDF";
}

export interface ActualVisit {
  id: string;
  tripId: TripId;
  date: string;
  day: number;
  title: string;
  city: string;
  region: string;
  status: ActualVisitStatus;
  evidence: ActualVisitEvidence;
  googleMapsQuery: string;
  latitude?: number;
  longitude?: number;
  plannedActivityId?: string;
  expenseIds: string[];
  notes: string;
}

export interface TripJournalDay {
  id: string;
  date: string;
  day: number;
  chapter: string;
  title: string;
  summary: string;
  visitIds: string[];
  imageActivityTitle: string;
}

export interface TripActuals {
  sourceTotalCad: number;
  originalTotals: { CAD: number; EUR: number };
  eurToCad: number;
  expenses: ActualExpense[];
  visits: ActualVisit[];
  journalDays: TripJournalDay[];
  sourceNote: string;
}

export interface Trip {
  id: TripId;
  title: string;
  country: string;
  startDate?: string;
  endDate?: string;
  currency: TripCurrency;
  currencyConfig?: TripCurrencyConfig;
  description: string;
  activities: TripActivity[];
  flights: TripFlight[];
  hotels: TripHotel[];
  attachments: TripAttachment[];
  notes: string;
  actuals?: TripActuals;
}
