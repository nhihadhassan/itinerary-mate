export type TripId = "japan-2026" | "peru-2026";
export type TripCurrency = "JPY" | "CAD" | "PEN" | "USD";
export type TripActivityType = "activity" | "food" | "hotel" | "flight" | "transport" | "note";
export type TripSource = "japan-default" | "Wanderlog" | "Google Doc" | "manual" | "placeholder" | "needs confirmation";
export type CostStatus = "imported" | "converted-estimate" | "needs-confirmation" | "manual";
export type BookingStatus = "booked" | "not-booked" | "optional" | "needs-confirmation";
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
}
