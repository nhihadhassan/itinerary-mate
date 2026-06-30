import type {
  ActualExpense,
  ActualExpenseCategory,
  ActualVisit,
  ActualVisitEvidence,
  ActualVisitStatus,
  TripActuals,
  TripJournalDay,
} from "./tripTypes";

export const PORTUGAL_ACTUAL_TOTAL_CAD = 4563.76;
export const PORTUGAL_ACTUAL_CAD_TOTAL = 3610.77;
export const PORTUGAL_ACTUAL_EUR_TOTAL = 587.24;
export const PORTUGAL_ACTUAL_EUR_TO_CAD = 1.622829;

type ExpenseSeed = [date: string, merchant: string, category: string, amount: number, currency: "CAD" | "EUR", city: string];

const expenseSeeds: ExpenseSeed[] = [
  ["2026-06-24", "Uber to Airport", "Transit", 42.12, "CAD", "Porto"],
  ["2026-06-24", "Port Wine Gift", "Drinks", 20.43, "CAD", "Porto"],
  ["2026-06-24", "Airport Snacks", "Food", 6.40, "CAD", "Porto"],
  ["2026-06-24", "Tim Hortons", "Food", 21.69, "CAD", "Porto"],
  ["2026-06-23", "Café Santiago F", "Food", 27.50, "CAD", "Porto"],
  ["2026-06-23", "Manteigaria", "Food", 7.32, "CAD", "Porto"],
  ["2026-06-23", "Bifana", "Food", 10.54, "CAD", "Porto"],
  ["2026-06-23", "Hammer", "Shopping", 6.51, "CAD", "Porto"],
  ["2026-06-23", "Espresso", "Drinks", 1.55, "CAD", "Porto"],
  ["2026-06-23", "A Pérola do Bolhão", "Shopping", 14.48, "CAD", "Porto"],
  ["2026-06-23", "Manteigaria - Fábrica de Pastéis de Nata", "Food", 8.11, "CAD", "Porto"],
  ["2026-06-22", "Han Table Barbecue Porto", "Food", 20.00, "EUR", "Porto"],
  ["2026-06-22", "Pão Fôfo", "Food", 2.03, "CAD", "Porto"],
  ["2026-06-22", "Regua", "Food", 12.53, "CAD", "Douro Valley"],
  ["2026-06-22", "Fábrica da Nata (Praça Almeida Garrett)", "Food", 2.44, "CAD", "Porto"],
  ["2026-06-22", "Manteigaria", "Food", 9.76, "CAD", "Porto"],
  ["2026-06-22", "Churros Papa Tony", "Food", 13.02, "EUR", "Porto"],
  ["2026-06-22", "Porto walking tour", "Sightseeing", 20.00, "EUR", "Porto"],
  ["2026-06-22", "Continente Bom Dia Porto - Luís de Aguiar", "Food", 46.00, "CAD", "Porto"],
  ["2026-06-22", "Douro Valley Tour", "Activities", 289.06, "CAD", "Douro Valley"],
  ["2026-06-21", "Mamma Bella Cais de Gaia", "Food", 53.86, "CAD", "Porto"],
  ["2026-06-21", "Combi Coffee Roasters", "Food", 2.93, "CAD", "Porto"],
  ["2026-06-21", "Souvenirs Porto", "Shopping", 8.14, "CAD", "Porto"],
  ["2026-06-20", "Lisbon to Porto", "Transit", 41.79, "CAD", "Porto"],
  ["2026-06-20", "Bolt", "Transit", 13.26, "CAD", "Porto"],
  ["2026-06-20", "Pastel de Nata", "Food", 4.88, "CAD", "Porto"],
  ["2026-06-20", "Pastel de Nata", "Food", 4.88, "CAD", "Porto"],
  ["2026-06-20", "Bolt to Airbnb", "Transit", 7.16, "CAD", "Porto"],
  ["2026-06-20", "Manteigaria", "Food", 2.44, "CAD", "Porto"],
  ["2026-06-20", "Café Santiago", "Food", 34.33, "CAD", "Porto"],
  ["2026-06-20", "Tv. da Lomba 34", "Lodging", 465.03, "CAD", "Porto"],
  ["2026-06-19", "COPACABANA", "Drinks", 15.44, "CAD", "Sintra"],
  ["2026-06-19", "Espresso", "Drinks", 6.50, "CAD", "Sintra"],
  ["2026-06-19", "Aldi", "Groceries", 22.16, "CAD", "Sintra"],
  ["2026-06-19", "Restaurante Atlantiko Sintra", "Food", 67.15, "CAD", "Sintra"],
  ["2026-06-18", "Other", "Other", 16.30, "CAD", "Lisbon"],
  ["2026-06-18", "Pingo", "Groceries", 3.24, "CAD", "Lisbon"],
  ["2026-06-18", "Pingo", "Groceries", 1.25, "CAD", "Lisbon"],
  ["2026-06-18", "Bonjardim", "Food", 52.15, "CAD", "Lisbon"],
  ["2026-06-18", "Breakfast Lovers Tram 28", "Activities", 30.80, "CAD", "Lisbon"],
  ["2026-06-18", "Castelo de São Jorge", "Activities", 27.71, "CAD", "Lisbon"],
  ["2026-06-18", "Pastelaria Santo António", "Food", 4.56, "CAD", "Lisbon"],
  ["2026-06-18", "Praça do Comércio", "Activities", 20.00, "EUR", "Lisbon"],
  ["2026-06-18", "Groceries", "Groceries", 3.23, "CAD", "Lisbon"],
  ["2026-06-18", "Drinks", "Drinks", 3.42, "CAD", "Lisbon"],
  ["2026-06-17", "Transit", "Transit", 3.12, "CAD", "Lisbon"],
  ["2026-06-17", "Groceries", "Groceries", 2.52, "CAD", "Lisbon"],
  ["2026-06-17", "Groceries", "Groceries", 3.74, "CAD", "Lisbon"],
  ["2026-06-17", "Food", "Groceries", 8.40, "CAD", "Lisbon"],
  ["2026-06-17", "Groceries", "Groceries", 20.81, "CAD", "Lisbon"],
  ["2026-06-17", "McDonald's", "Food", 6.83, "CAD", "Lisbon"],
  ["2026-06-17", "Yak & Yeti (Lisbon)", "Food", 40.56, "CAD", "Lisbon"],
  ["2026-06-17", "Nata Portuguesa", "Food", 2.39, "CAD", "Lisbon"],
  ["2026-06-17", "The Bakery Café", "Food", 22.60, "CAD", "Lisbon"],
  ["2026-06-17", "Hostel Green Heart", "Lodging", 256.50, "EUR", "Lisbon"],
  ["2026-06-16", "Snacks", "Food", 4.06, "CAD", "Lagos"],
  ["2026-06-16", "illicit Burgers", "Food", 14.29, "CAD", "Lagos"],
  ["2026-06-16", "Uber to Porto Bus Stn", "Transit", 6.40, "CAD", "Lagos"],
  ["2026-06-16", "Lagos to Lisbon", "Transit", 17.62, "CAD", "Lagos"],
  ["2026-06-16", "La Focaccia", "Food", 9.75, "CAD", "Lagos"],
  ["2026-06-16", "Souvenir", "Shopping", 12.02, "CAD", "Lagos"],
  ["2026-06-16", "The Original Grater", "Shopping", 16.24, "CAD", "Lagos"],
  ["2026-06-16", "Air Transat 7463", "Flights", 727.87, "CAD", "Lagos"],
  ["2026-06-15", "Lagos Beer&Co", "Drinks", 4.86, "CAD", "Lagos"],
  ["2026-06-15", "Pizza Garage", "Food", 14.50, "CAD", "Lagos"],
  ["2026-06-14", "Kohinoor Indian Restaurant", "Food", 33.21, "CAD", "Lagos"],
  ["2026-06-14", "Pizza Hut", "Food", 8.02, "CAD", "Lagos"],
  ["2026-06-14", "Ponta da Piedade Tours", "Activities", 40.00, "EUR", "Lagos"],
  ["2026-06-14", "Indigo Bar", "Food", 24.62, "CAD", "Lagos"],
  ["2026-06-13", "Bar Mellow Loco", "Drinks", 4.86, "CAD", "Lagos"],
  ["2026-06-13", "Rede Expressos to Lagos", "Transit", 17.58, "CAD", "Lagos"],
  ["2026-06-13", "Continente Bom Dia Rua da Palma", "Groceries", 19.67, "CAD", "Lagos"],
  ["2026-06-13", "Sol a Sol Hostel", "Lodging", 171.57, "CAD", "Lagos"],
  ["2026-06-12", "Castelo Souvenir Shop", "Shopping", 11.16, "CAD", "Lisbon"],
  ["2026-06-12", "Water", "Food", 1.71, "CAD", "Lisbon"],
  ["2026-06-12", "Zeluna", "Food", 6.47, "CAD", "Lisbon"],
  ["2026-06-12", "Pastelaria Aloma", "Food", 4.75, "CAD", "Lisbon"],
  ["2026-06-12", "Lisboa Cheia de Graça", "Food", 19.41, "CAD", "Lisbon"],
  ["2026-06-12", "Bolt", "Transit", 18.14, "CAD", "Lisbon"],
  ["2026-06-12", "Castelo de São Jorge", "Activities", 27.49, "CAD", "Lisbon"],
  ["2026-06-12", "Oceanário de Lisboa", "Activities", 39.30, "CAD", "Lisbon"],
  ["2026-06-11", "Bolt", "Transit", 6.32, "EUR", "Lisbon"],
  ["2026-06-11", "100 Montaditos Rossio", "Food", 9.32, "CAD", "Lisbon"],
  ["2026-06-11", "Chickinho Lx Factory", "Food", 16.09, "CAD", "Lisbon"],
  ["2026-06-11", "Pita.gr FoodTruck Chef Thassos", "Food", 9.00, "EUR", "Lisbon"],
  ["2026-06-11", "Nosolo Italia", "Food", 5.16, "CAD", "Lisbon"],
  ["2026-06-11", "Cais do Sodre", "Transit", 6.29, "CAD", "Lisbon"],
  ["2026-06-11", "Pastéis de Belém", "Food", 5.16, "CAD", "Lisbon"],
  ["2026-06-11", "Pineapple drink", "Food", 16.13, "CAD", "Lisbon"],
  ["2026-06-11", "Jerónimos Monastery", "Shopping", 5.00, "EUR", "Lisbon"],
  ["2026-06-11", "Monumento a Afonso de Albuquerque", "Sightseeing", 10.00, "EUR", "Lisbon"],
  ["2026-06-10", "Sangria", "Drinks", 6.46, "CAD", "Lisbon"],
  ["2026-06-10", "Frei Papinhas Restaurant", "Food", 3.23, "CAD", "Lisbon"],
  ["2026-06-10", "Zubir Churrasqueira", "Food", 17.75, "CAD", "Lisbon"],
  ["2026-06-10", "Nata Portuguesa", "Food", 2.37, "CAD", "Lisbon"],
  ["2026-06-10", "Fruit cup", "Food", 4.00, "EUR", "Lisbon"],
  ["2026-06-10", "Praça do Comércio", "Sightseeing", 10.00, "EUR", "Lisbon"],
  ["2026-06-09", "Retiro Dos Sentidos", "Activities", 15.00, "EUR", "Lisbon"],
  ["2026-06-09", "Metro Baixa Chiado", "Transit", 3.87, "CAD", "Lisbon"],
  ["2026-06-09", "Pastelaria Lenita", "Food", 1.93, "CAD", "Lisbon"],
  ["2026-06-09", "Fauna & Flora- Anjos", "Food", 13.69, "CAD", "Lisbon"],
  ["2026-06-09", "We Hate F Tourists - Hostel", "Lodging", 158.40, "EUR", "Lisbon"],
  ["2026-06-08", "Air Transat 480", "Flights", 735.70, "CAD", "Toronto"],
];

const categoryMap: Record<string, ActualExpenseCategory> = {
  Flights: "flight",
  Lodging: "lodging",
  Food: "food",
  Drinks: "drinks",
  Groceries: "groceries",
  Activities: "activity",
  Sightseeing: "sightseeing",
  Transit: "transport",
  Shopping: "shopping",
  Other: "other",
};

function slug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const duplicateCounts = new Map<string, number>();
const baseExpenses: ActualExpense[] = expenseSeeds.map(([date, merchant, category, amount, currency, city]) => {
  const key = `${date}-${slug(merchant)}`;
  const sequence = (duplicateCounts.get(key) || 0) + 1;
  duplicateCounts.set(key, sequence);
  return {
    id: `pt-exp-${key}${sequence > 1 ? `-${sequence}` : ""}`,
    tripId: "portugal-2026",
    date,
    merchant,
    category: categoryMap[category],
    amount,
    currency,
    cadEquivalent: currency === "CAD" ? amount : amount * PORTUGAL_ACTUAL_EUR_TO_CAD,
    city,
    isShared: true,
    source: "Wanderlog PDF",
  };
});

type VisitSeed = [date: string, title: string, city: string, region: string, status: ActualVisitStatus, evidence: ActualVisitEvidence, query?: string];

const visitSeeds: VisitSeed[] = [
  ["2026-06-08", "Toronto to Lisbon", "Toronto", "Flight", "visited", "expense", "Toronto Pearson to Lisbon"],
  ["2026-06-09", "We Hate F Tourists - Hostel", "Lisbon", "Lisbon", "visited", "expense"],
  ["2026-06-09", "Metro Baixa Chiado", "Lisbon", "Baixa", "visited", "expense"],
  ["2026-06-09", "Fauna & Flora - Anjos", "Lisbon", "Anjos", "visited", "expense"],
  ["2026-06-09", "Viewpoint of Monte Agudo", "Lisbon", "Anjos", "visited", "dated-itinerary"],
  ["2026-06-09", "Retiro Dos Sentidos", "Lisbon", "Anjos", "visited", "expense"],
  ["2026-06-10", "Praça do Comércio", "Lisbon", "Baixa", "visited", "expense"],
  ["2026-06-10", "Rua Augusta Arch", "Lisbon", "Baixa", "visited", "dated-itinerary"],
  ["2026-06-10", "Carmo Archaeological Museum", "Lisbon", "Chiado", "visited", "dated-itinerary"],
  ["2026-06-10", "Santa Justa Lift", "Lisbon", "Baixa", "unconfirmed", "dated-itinerary"],
  ["2026-06-10", "Miradouro de Santa Luzia", "Lisbon", "Alfama", "visited", "dated-itinerary"],
  ["2026-06-10", "Miradouro da Graça", "Lisbon", "Graça", "visited", "dated-itinerary"],
  ["2026-06-11", "Pastéis de Belém", "Lisbon", "Belém", "visited", "expense"],
  ["2026-06-11", "Jerónimos Monastery", "Lisbon", "Belém", "visited", "expense"],
  ["2026-06-11", "Monument to the Discoveries", "Lisbon", "Belém", "visited", "expense"],
  ["2026-06-11", "Belém Tower", "Lisbon", "Belém", "unconfirmed", "dated-itinerary"],
  ["2026-06-11", "MAAT - Museum of Art, Architecture and Technology", "Lisbon", "Belém", "visited", "dated-itinerary"],
  ["2026-06-11", "LX Factory", "Lisbon", "Alcântara", "visited", "expense"],
  ["2026-06-11", "Miradouro de São Pedro de Alcântara", "Lisbon", "Bairro Alto", "visited", "dated-itinerary"],
  ["2026-06-12", "Oceanário de Lisboa", "Lisbon", "Parque das Nações", "visited", "expense"],
  ["2026-06-12", "Castelo de São Jorge", "Lisbon", "Alfama", "visited", "expense"],
  ["2026-06-13", "Lisbon to Lagos", "Lagos", "Algarve", "visited", "expense"],
  ["2026-06-13", "Sol a Sol Hostel", "Lagos", "Algarve", "visited", "expense"],
  ["2026-06-14", "Ponta da Piedade Tours", "Lagos", "Algarve", "visited", "expense"],
  ["2026-06-14", "Indigo Bar", "Lagos", "Algarve", "visited", "expense"],
  ["2026-06-15", "Ponta da Piedade", "Lagos", "Algarve", "visited", "dated-itinerary"],
  ["2026-06-15", "Praia do Camilo", "Lagos", "Algarve", "visited", "dated-itinerary"],
  ["2026-06-15", "Praia Dona Ana", "Lagos", "Algarve", "visited", "dated-itinerary"],
  ["2026-06-15", "Porto Mós Beach", "Lagos", "Algarve", "visited", "dated-itinerary"],
  ["2026-06-15", "Praia do Pinhão", "Lagos", "Algarve", "unconfirmed", "dated-itinerary"],
  ["2026-06-15", "Beach Estudantes", "Lagos", "Algarve", "visited", "dated-itinerary"],
  ["2026-06-16", "Lagos to Lisbon", "Lagos", "Algarve", "visited", "expense"],
  ["2026-06-17", "Hostel Green Heart", "Lisbon", "Lisbon", "visited", "expense"],
  ["2026-06-17", "Miradouro da Senhora do Monte", "Lisbon", "Graça", "visited", "dated-itinerary"],
  ["2026-06-18", "Alfama", "Lisbon", "Alfama", "visited", "dated-itinerary"],
  ["2026-06-18", "Tram 28", "Lisbon", "Alfama", "visited", "expense"],
  ["2026-06-18", "Castelo de São Jorge", "Lisbon", "Alfama", "visited", "expense"],
  ["2026-06-19", "Sintra", "Sintra", "Sintra", "visited", "dated-itinerary"],
  ["2026-06-19", "Quinta da Regaleira", "Sintra", "Sintra", "visited", "dated-itinerary"],
  ["2026-06-19", "National Palace of Pena", "Sintra", "Sintra", "visited", "dated-itinerary"],
  ["2026-06-19", "Cape Roca", "Sintra", "Sintra", "visited", "dated-itinerary"],
  ["2026-06-20", "Lisbon to Porto", "Porto", "Porto", "visited", "expense"],
  ["2026-06-20", "Marginal de Gaia", "Porto", "Gaia", "visited", "dated-itinerary"],
  ["2026-06-20", "Café Santiago", "Porto", "Porto", "visited", "expense"],
  ["2026-06-21", "Igreja do Carmo", "Porto", "Porto", "visited", "dated-itinerary"],
  ["2026-06-21", "Portuguese Centre of Photography", "Porto", "Porto", "visited", "dated-itinerary"],
  ["2026-06-21", "Torre dos Clérigos", "Porto", "Porto", "visited", "dated-itinerary"],
  ["2026-06-21", "Porto São Bento", "Porto", "Porto", "visited", "dated-itinerary"],
  ["2026-06-21", "Porto Cathedral", "Porto", "Porto", "visited", "dated-itinerary"],
  ["2026-06-21", "Luís I Bridge", "Porto", "Porto", "visited", "dated-itinerary"],
  ["2026-06-22", "Douro Valley Tour", "Douro Valley", "Douro Valley", "visited", "expense"],
  ["2026-06-22", "Regua", "Douro Valley", "Douro Valley", "visited", "expense"],
  ["2026-06-22", "Quinta de São Luiz", "Douro Valley", "Douro Valley", "visited", "dated-itinerary"],
  ["2026-06-23", "A Pérola do Bolhão", "Porto", "Porto", "visited", "expense"],
  ["2026-06-23", "Cristal Park", "Porto", "Porto", "visited", "dated-itinerary"],
  ["2026-06-23", "Luís I Bridge", "Porto", "Porto", "visited", "dated-itinerary"],
  ["2026-06-24", "Porto to Toronto", "Porto", "Flight", "visited", "expense", "Porto Airport to Toronto"],
];

function expenseMatchesVisit(expense: ActualExpense, title: string) {
  const expenseKey = slug(expense.merchant);
  const titleKey = slug(title);
  return expenseKey === titleKey || expenseKey.includes(titleKey) || titleKey.includes(expenseKey);
}

const visits: ActualVisit[] = visitSeeds.map(([date, title, city, region, status, evidence, query], index) => {
  const expenseIds = baseExpenses.filter((expense) => expense.date === date && expenseMatchesVisit(expense, title)).map((expense) => expense.id);
  return {
    id: `pt-visit-${date}-${slug(title)}-${index + 1}`,
    tripId: "portugal-2026",
    date,
    day: Math.round((new Date(`${date}T12:00:00`).getTime() - new Date("2026-06-08T12:00:00").getTime()) / 86400000) + 1,
    title,
    city,
    region,
    status,
    evidence,
    googleMapsQuery: query || `${title} ${city} Portugal`,
    expenseIds,
    notes: status === "unconfirmed" ? "Present in the dated itinerary, but the source does not prove the stop was completed." : "Confirmed from the dated route or expense ledger.",
  };
});

const visitByExpense = new Map(visits.flatMap((visit) => visit.expenseIds.map((expenseId) => [expenseId, visit.id])));
const expenses = baseExpenses.map((expense) => ({ ...expense, visitId: visitByExpense.get(expense.id) }));

const journalSeeds: Array<[string, string, string, string]> = [
  ["2026-06-08", "Departure", "Across the Atlantic", "An overnight flight opened a seventeen-day route through Lisbon, the Algarve, Sintra, Porto, and the Douro Valley."],
  ["2026-06-09", "Lisbon", "Anjos and the first viewpoints", "Arrival day stayed close to the hostel, moving through Anjos cafés and a quiet viewpoint before the city widened out."],
  ["2026-06-10", "Lisbon", "Baixa, Chiado, and Alfama", "Central Lisbon unfolded through tiled streets, open squares, the Carmo ruins, and hilltop viewpoints above Alfama."],
  ["2026-06-11", "Lisbon", "Belém and the riverfront", "The western riverfront connected pastries, Manueline stonework, monuments, MAAT, and the industrial lanes of LX Factory."],
  ["2026-06-12", "Lisbon", "Oceanário and the castle", "Modern Lisbon and the old citadel shared the day, with the aquarium followed by food stops and Castelo de São Jorge."],
  ["2026-06-13", "Lagos", "South to the Algarve", "A long bus journey traded Lisbon's hills for Lagos, a rooftop hostel, and an easy first evening in the old town."],
  ["2026-06-14", "Lagos", "Ponta da Piedade by water", "The Algarve's cliffs came into focus from the water before a relaxed sequence of nearby food stops."],
  ["2026-06-15", "Lagos", "The coastal walk", "A full coastal day linked Ponta da Piedade with Camilo, Dona Ana, Porto Mós, and the coves closest to Lagos."],
  ["2026-06-16", "Lagos", "The return north", "The final Algarve morning folded into the journey back to Lisbon and the second outbound flight from Toronto."],
  ["2026-06-17", "Lisbon", "Lisbon, together", "The trip restarted from Green Heart with bakeries, city-center curiosities, a high viewpoint, and a late dinner."],
  ["2026-06-18", "Lisbon", "Alfama and Tram 28", "A catch-up day returned to Praça do Comércio, Alfama, the castle, Tram 28, and classic Lisbon food stops."],
  ["2026-06-19", "Sintra", "Palaces and the Atlantic edge", "Sintra moved from Regaleira's gardens to Pena's color and the open Atlantic horizon at Cape Roca."],
  ["2026-06-20", "Porto", "North to Porto", "The route shifted to Porto by coach, then crossed into Gaia for the first river views and a francesinha dinner."],
  ["2026-06-21", "Porto", "Stone, tiles, and the Douro", "Historic Porto was a long walking day of churches, photography, São Bento, the cathedral, and the Luís I Bridge."],
  ["2026-06-22", "Douro Valley", "A day through the Douro", "The longest excursion followed the river inland through Régua, vineyard landscapes, and a sequence of valley stops."],
  ["2026-06-23", "Porto", "One final Porto circuit", "The last full day returned to pastry counters, Bolhão, the Crystal Palace gardens, and the bridge at evening."],
  ["2026-06-24", "Departure", "Home from Porto", "An early airport ride closed the route with Porto gifts, airport food, and the two-leg flight home."],
];

const imageTitleByChapter: Record<string, string> = {
  Departure: "Porto",
  Lisbon: "Miradouro de São Pedro de Alcântara",
  Lagos: "Ponta da Piedade",
  Sintra: "National Palace of Pena",
  Porto: "Ribeira",
  "Douro Valley": "Douro Valley tour",
};

const journalDays: TripJournalDay[] = journalSeeds.map(([date, chapter, title, summary], index) => ({
  id: `pt-journal-${date}`,
  date,
  day: index + 1,
  chapter,
  title,
  summary,
  visitIds: visits.filter((visit) => visit.date === date).map((visit) => visit.id),
  imageActivityTitle: imageTitleByChapter[chapter],
}));

export const portugalActualTrip: TripActuals = {
  sourceTotalCad: PORTUGAL_ACTUAL_TOTAL_CAD,
  originalTotals: { CAD: PORTUGAL_ACTUAL_CAD_TOTAL, EUR: PORTUGAL_ACTUAL_EUR_TOTAL },
  eurToCad: PORTUGAL_ACTUAL_EUR_TO_CAD,
  expenses,
  visits,
  journalDays,
  sourceNote: "Wanderlog is the authoritative route and expense source. The Scotiabank statement ending June 8 was used only to verify matching prepaid bookings; no statement transaction was imported twice.",
};

export function portugalActualMarkdown(actuals = portugalActualTrip) {
  const lines = [
    "# Portugal 2026: Actual Trip",
    "",
    "June 8-24, 2026 | Lisbon, Lagos, Sintra, Porto, and the Douro Valley",
    "",
    `**Actual trip total:** CA$${actuals.sourceTotalCad.toFixed(2)}`,
    `**Original-currency ledger:** CA$${actuals.originalTotals.CAD.toFixed(2)} + €${actuals.originalTotals.EUR.toFixed(2)}`,
    `**Historical blended conversion:** €1 = CA$${actuals.eurToCad.toFixed(6)}`,
    "",
    actuals.sourceNote,
    "",
    "## Journey",
    "",
  ];
  for (const day of actuals.journalDays) {
    const dayVisits = actuals.visits.filter((visit) => day.visitIds.includes(visit.id));
    lines.push(`### Day ${day.day}: ${day.title}`, "", day.summary, "", ...dayVisits.map((visit) => `- ${visit.title} (${visit.status}, ${visit.evidence})`), "");
  }
  lines.push("## Itemized Expenses", "", "| Date | Merchant | Category | Original | CAD equivalent |", "| --- | --- | --- | ---: | ---: |");
  for (const expense of actuals.expenses) {
    lines.push(`| ${expense.date} | ${expense.merchant.replace(/\|/g, "\\|")} | ${expense.category} | ${expense.currency === "EUR" ? "€" : "CA$"}${expense.amount.toFixed(2)} | CA$${expense.cadEquivalent.toFixed(2)} |`);
  }
  return lines.join("\n");
}
