export type Category = "Must See" | "Non-Negotiable" | "Nice To Have" | "Extra";
export type EnergyLevel = "light" | "medium" | "heavy";
export type BookingRequired = "yes" | "no" | "optional";
export type TimeOfDay = "early morning" | "morning" | "midday" | "afternoon" | "evening" | "flexible";
export type TripBranch = "hokkaido" | "kyushu";

export interface Activity {
  id: string;
  day: number;
  title: string;
  city: string;
  region: string;
  category: Category;
  priority: number;
  description: string;
  imageUrl: string;
  imageAlt?: string;
  imageCredit?: string;
  imageCreditUrl?: string;
  imageLicense?: string;
  imageSearchQuery?: string;
  estimatedCostLow: number;
  estimatedCostMid: number;
  estimatedCostHigh: number;
  visitDuration: string;
  durationHours: number;
  travelTimeFromBase: string;
  travelMinutesFromBase: number;
  suggestedTimeOfDay: TimeOfDay;
  energyLevel: EnergyLevel;
  bookingRequired: BookingRequired;
  weatherSensitive: boolean;
  backupOption: string;
  notes: string;
  logisticsNotes: string;
  googleMapsQuery: string;
  isBooked: boolean;
  isCompleted: boolean;
  branch?: TripBranch;
}

export interface PlaceImage {
  imageUrl: string;
  imageAlt: string;
  imageCredit?: string;
  imageCreditUrl?: string;
  imageLicense?: string;
  imageSearchQuery: string;
}

export interface StayArea {
  id: string;
  city: string;
  area: string;
  nights: number;
  days: string;
  estimatedLowPerNight: number;
  estimatedMidPerNight: number;
  estimatedHighPerNight: number;
  note: string;
  branch?: TripBranch;
}

export interface RouteMove {
  id: string;
  from: string;
  to: string;
  day: number;
  mode: string;
  duration: string;
  estimatedLow: number;
  estimatedMid: number;
  estimatedHigh: number;
  note: string;
  branch?: TripBranch;
}

export interface DailyCost {
  city: string;
  days: number[];
  localTransitLow: number;
  localTransitMid: number;
  localTransitHigh: number;
  foodLow: number;
  foodMid: number;
  foodHigh: number;
  branch?: TripBranch;
}

export interface SpecialExperience {
  id: string;
  title: string;
  city: string;
  category: "lodging" | "transport" | "attractions" | "food" | "shopping/miscellaneous";
  estimatedLow: number;
  estimatedMid: number;
  estimatedHigh: number;
  note: string;
}

export const DEFAULT_CAD_TO_JPY = 110;

export const categories: Category[] = ["Must See", "Non-Negotiable", "Nice To Have", "Extra"];

export const tripAnchors = [
  {
    title: "Tokyo megacity",
    body: "Crowds, lights, tiny bars, spotless trains, and the sense that the city has ten speeds.",
  },
  {
    title: "Old Japan in Kyoto",
    body: "Temples, shrines, gardens, and early starts before the tour groups arrive.",
  },
  {
    title: "Fuji pause",
    body: "A slower reset between cities, with lake views or onsen time if the weather cooperates.",
  },
  {
    title: "Food-first Osaka",
    body: "Go for the street energy, late dinners, and snack-by-snack wandering.",
  },
  {
    title: "History and water",
    body: "Hiroshima and Miyajima add weight, quiet, and one of the best ferry days of the trip.",
  },
];

export const reasonBuckets = [
  {
    title: "Things people go specifically to Japan for",
    items: ["food counters", "temples and shrines", "anime and games", "onsen", "trains", "design stores", "seasonal snacks"],
  },
  {
    title: "Must-sees",
    items: ["Shibuya Crossing", "Senso-ji", "Fushimi Inari", "Arashiyama", "Dotonbori", "Miyajima"],
  },
  {
    title: "Non-negotiables",
    items: ["one ryokan or onsen stay", "one Shinkansen ride", "Nara deer park", "Hiroshima Peace Memorial Museum"],
  },
  {
    title: "Nice-to-haves",
    items: ["Ghibli Museum", "teamLab", "Kanazawa gardens", "Takayama morning market", "sumo or baseball"],
  },
  {
    title: "Extras",
    items: ["USJ", "shopping day", "coffee crawl", "rainy arcade night", "Hokkaido or Kyushu extension"],
  },
];

const commonsFile = (fileName: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=1200`;

export const placeImageCatalog: Record<string, PlaceImage> = {
  "tokyo-shibuya": {
    imageUrl: commonsFile("Tokyo Shibuya Scramble Crossing 2018-10-09.jpg"),
    imageAlt: "Crowds crossing Shibuya Scramble Crossing in Tokyo.",
    imageCredit: "Benh LIEU SONG via Wikimedia Commons",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:Tokyo_Shibuya_Scramble_Crossing_2018-10-09.jpg",
    imageLicense: "CC BY-SA 2.0",
    imageSearchQuery: "Shibuya Crossing Tokyo night",
  },
  "tokyo-shinjuku": {
    imageUrl: commonsFile("Colorful neon street signs in Kabukichō, Shinjuku, Tokyo.jpg"),
    imageAlt: "Neon signs in Kabukicho, Shinjuku at night.",
    imageCredit: "Basile Morin via Wikimedia Commons",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:Colorful_neon_street_signs_in_Kabukich%C5%8D,_Shinjuku,_Tokyo.jpg",
    imageLicense: "CC BY-SA 4.0",
    imageSearchQuery: "Shinjuku Tokyo neon night",
  },
  "tokyo-asakusa": {
    imageUrl: commonsFile("Five-storied Pagoda, Sensoji, Tokyo, 20240824 1103 5616.jpg"),
    imageAlt: "Five-storied pagoda at Senso-ji in Tokyo.",
    imageCredit: "Jakub Halun via Wikimedia Commons",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:Five-storied_Pagoda,_Sensoji,_Tokyo,_20240824_1103_5616.jpg",
    imageLicense: "CC BY 4.0",
    imageSearchQuery: "Senso-ji temple Tokyo",
  },
  "tokyo-akihabara": {
    imageUrl: commonsFile("Claw cranes with kawaii stuffed mascots and a woman playing, Akihabara, Chiyoda, Tokyo, Japan.jpg"),
    imageAlt: "Arcade claw machines in Akihabara, Tokyo.",
    imageCredit: "Basile Morin via Wikimedia Commons",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:Claw_cranes_with_kawaii_stuffed_mascots_and_a_woman_playing,_Akihabara,_Chiyoda,_Tokyo,_Japan.jpg",
    imageLicense: "CC BY-SA 4.0",
    imageSearchQuery: "Akihabara Tokyo arcades",
  },
  "tokyo-meiji": {
    imageUrl: commonsFile("Takeshita Street entrance on Meiji Avenue side.jpg"),
    imageAlt: "Entrance to Takeshita Street in Harajuku.",
    imageCredit: "Syced via Wikimedia Commons",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:Takeshita_Street_entrance_on_Meiji_Avenue_side.jpg",
    imageLicense: "CC0",
    imageSearchQuery: "Harajuku Takeshita Street Tokyo",
  },
  "tokyo-tsukiji": {
    imageUrl: commonsFile("Tsukiji Outer Market -04.jpg"),
    imageAlt: "Tsukiji Outer Market street stalls in Tokyo.",
    imageCredit: "Aimaimyi via Wikimedia Commons",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:Tsukiji_Outer_Market_-04.jpg",
    imageLicense: "CC BY-SA 3.0",
    imageSearchQuery: "Tsukiji Outer Market Tokyo",
  },
  "tokyo-teamlab": {
    imageUrl: "",
    imageAlt: "Generated abstract light-card placeholder for teamLab.",
    imageSearchQuery: "teamLab Planets Tokyo official photo",
  },
  "tokyo-ghibli": {
    imageUrl: "",
    imageAlt: "Generated illustrated museum-card placeholder for Ghibli Museum.",
    imageSearchQuery: "Ghibli Museum Mitaka exterior",
  },
  "tokyo-ueno": {
    imageUrl: "",
    imageAlt: "Generated park and museum-card placeholder for Ueno.",
    imageSearchQuery: "Ueno Park Tokyo museums",
  },
  "tokyo-daikanyama": {
    imageUrl: "",
    imageAlt: "Generated design-store-card placeholder for Daikanyama.",
    imageSearchQuery: "Daikanyama Nakameguro Tokyo",
  },
  "fuji-lake": {
    imageUrl: commonsFile("Lake Kawaguchiko Sakura Mount Fuji 4.JPG"),
    imageAlt: "Mount Fuji seen across Lake Kawaguchiko.",
    imageCredit: "Midori via Wikimedia Commons",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:Lake_Kawaguchiko_Sakura_Mount_Fuji_4.JPG",
    imageLicense: "CC BY 3.0",
    imageSearchQuery: "Lake Kawaguchiko Mount Fuji",
  },
  "fuji-chureito": {
    imageUrl: commonsFile("Chureito Pagoda and Mount Fuji Wikivoyage banner.jpg"),
    imageAlt: "Chureito Pagoda with Mount Fuji in the background.",
    imageCredit: "Manishprabhune via Wikimedia Commons",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:Chureito_Pagoda_and_Mount_Fuji_Wikivoyage_banner.jpg",
    imageLicense: "CC BY-SA 4.0",
    imageSearchQuery: "Chureito Pagoda Mount Fuji",
  },
  "fuji-onsen": {
    imageUrl: "",
    imageAlt: "Generated onsen-card placeholder for a ryokan evening.",
    imageSearchQuery: "Hakone ryokan onsen",
  },
  "fuji-hakone": {
    imageUrl: commonsFile("Onshi Hakone Park.jpg"),
    imageAlt: "View from Onshi Hakone Park.",
    imageCredit: "Christophe95 via Wikimedia Commons",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:Onshi_Hakone_Park.jpg",
    imageLicense: "CC BY-SA 4.0",
    imageSearchQuery: "Hakone Japan Lake Ashi",
  },
  "kyoto-fushimi": {
    imageUrl: commonsFile("Torii path with lantern at Fushimi Inari Taisha Shrine, Kyoto, Japan.jpg"),
    imageAlt: "Torii path at Fushimi Inari Taisha in Kyoto.",
    imageCredit: "Basile Morin via Wikimedia Commons",
    imageCreditUrl: "https://commons.wikimedia.org/wiki/File:Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine,_Kyoto,_Japan.jpg",
    imageLicense: "CC BY-SA 4.0",
    imageSearchQuery: "Fushimi Inari Kyoto torii",
  },
  "kyoto-gion": { imageUrl: "", imageAlt: "Generated lantern-lane placeholder for Gion.", imageSearchQuery: "Gion Kyoto evening street" },
  "kyoto-kiyomizu": { imageUrl: "", imageAlt: "Generated temple-balcony placeholder for Kiyomizu-dera.", imageSearchQuery: "Kiyomizu-dera Kyoto" },
  "kyoto-arashiyama": { imageUrl: "", imageAlt: "Generated bamboo-grove placeholder for Arashiyama.", imageSearchQuery: "Arashiyama bamboo grove Kyoto" },
  "kyoto-philosopher": { imageUrl: "", imageAlt: "Generated quiet temple-walk placeholder for Nanzen-ji.", imageSearchQuery: "Nanzen-ji Kyoto Philosopher Path" },
  "kyoto-nishiki": { imageUrl: "", imageAlt: "Generated covered-market placeholder for Nishiki Market.", imageSearchQuery: "Nishiki Market Kyoto" },
  "osaka-dotonbori": { imageUrl: "", imageAlt: "Generated neon-canal placeholder for Dotonbori and Namba.", imageSearchQuery: "Dotonbori Namba Osaka night" },
  "nara-park": { imageUrl: "", imageAlt: "Generated temple-and-park placeholder for Nara Park and Todai-ji.", imageSearchQuery: "Nara Park Todai-ji deer" },
  "osaka-usj": { imageUrl: "", imageAlt: "Generated theme-park placeholder for Universal Studios Japan.", imageSearchQuery: "Universal Studios Japan Osaka" },
  "osaka-castle": { imageUrl: "", imageAlt: "Generated castle-park placeholder for Osaka.", imageSearchQuery: "Osaka Castle Park" },
  "hiroshima-peace": { imageUrl: "", imageAlt: "Generated museum-park placeholder for Hiroshima Peace Memorial Museum.", imageSearchQuery: "Hiroshima Peace Memorial Museum" },
  "hiroshima-dome": { imageUrl: "", imageAlt: "Generated riverside memorial placeholder for the Atomic Bomb Dome.", imageSearchQuery: "Atomic Bomb Dome Hiroshima" },
  miyajima: { imageUrl: "", imageAlt: "Generated island-shrine placeholder for Miyajima and Itsukushima Shrine.", imageSearchQuery: "Miyajima Itsukushima Shrine floating torii" },
  "hiroshima-okonomiyaki": { imageUrl: "", imageAlt: "Generated counter-food placeholder for Hiroshima okonomiyaki.", imageSearchQuery: "Hiroshima okonomiyaki counter" },
  "kanazawa-garden": { imageUrl: "", imageAlt: "Generated garden-card placeholder for Kenroku-en.", imageSearchQuery: "Kenroku-en Kanazawa garden" },
  "kanazawa-districts": { imageUrl: "", imageAlt: "Generated tea-district placeholder for Kanazawa.", imageSearchQuery: "Higashi Chaya Kanazawa" },
  "takayama-old-town": { imageUrl: "", imageAlt: "Generated old-town placeholder for Takayama.", imageSearchQuery: "Takayama old town Japan" },
  "takayama-shirakawa": { imageUrl: "", imageAlt: "Generated thatched-village placeholder for Shirakawa-go.", imageSearchQuery: "Shirakawa-go thatched village" },
  "takayama-onsen": { imageUrl: "", imageAlt: "Generated mountain-dinner placeholder for Takayama.", imageSearchQuery: "Takayama Hida beef old town" },
  "hokkaido-sapporo": { imageUrl: "", imageAlt: "Generated city-park placeholder for Sapporo.", imageSearchQuery: "Sapporo Odori Park" },
  "hokkaido-otaru": { imageUrl: "", imageAlt: "Generated canal placeholder for Otaru.", imageSearchQuery: "Otaru canal Hokkaido" },
  "hokkaido-biei": { imageUrl: "", imageAlt: "Generated countryside placeholder for Biei and Furano.", imageSearchQuery: "Biei Furano Hokkaido fields" },
  "hokkaido-noboribetsu": { imageUrl: "", imageAlt: "Generated volcanic-onsen placeholder for Noboribetsu.", imageSearchQuery: "Noboribetsu Jigokudani Hokkaido" },
  "hokkaido-rest": { imageUrl: "", imageAlt: "Generated Sapporo rest-day placeholder.", imageSearchQuery: "Sapporo soup curry shopping" },
  "kyushu-fukuoka": { imageUrl: "", imageAlt: "Generated food-stall placeholder for Fukuoka.", imageSearchQuery: "Fukuoka yatai Hakata" },
  "kyushu-nagasaki": { imageUrl: "", imageAlt: "Generated harbor-city placeholder for Nagasaki.", imageSearchQuery: "Nagasaki Japan harbor" },
  "kyushu-dazaifu": { imageUrl: "", imageAlt: "Generated shrine-street placeholder for Dazaifu.", imageSearchQuery: "Dazaifu Tenmangu Kyushu" },
  "kyushu-beppu": { imageUrl: "", imageAlt: "Generated steam-onsen placeholder for Beppu.", imageSearchQuery: "Beppu onsen hells Japan" },
  "kyushu-yufuin": { imageUrl: "", imageAlt: "Generated mountain-onsen placeholder for Yufuin.", imageSearchQuery: "Yufuin onsen town" },
  "kyushu-rest": { imageUrl: "", imageAlt: "Generated park-and-ramen placeholder for Fukuoka.", imageSearchQuery: "Ohori Park Fukuoka ramen" },
  "tokyo-buffer-shop": { imageUrl: "", imageAlt: "Generated shopping-and-luggage placeholder for Tokyo buffer day.", imageSearchQuery: "Tokyo shopping Ginza Ueno" },
  "tokyo-final": { imageUrl: "", imageAlt: "Generated final-meal placeholder for Tokyo.", imageSearchQuery: "Tokyo final meal airport train" },
};

export const defaultStayAreas: StayArea[] = [
  { id: "stay-tokyo-1", city: "Tokyo", area: "Shinjuku or Ginza", nights: 6, days: "Days 1-6", estimatedLowPerNight: 13000, estimatedMidPerNight: 22000, estimatedHighPerNight: 38000, note: "Shinjuku is better for nights out; Ginza is calmer and cleaner for transit." },
  { id: "stay-fuji", city: "Fuji / Hakone", area: "Kawaguchiko lakefront or Hakone ryokan", nights: 2, days: "Days 7-8", estimatedLowPerNight: 16000, estimatedMidPerNight: 32000, estimatedHighPerNight: 62000, note: "This is the best place to spend more for a ryokan or onsen night." },
  { id: "stay-kyoto", city: "Kyoto", area: "Kawaramachi, Gion edge, or Kyoto Station", nights: 5, days: "Days 9-13", estimatedLowPerNight: 12000, estimatedMidPerNight: 23000, estimatedHighPerNight: 42000, note: "Kawaramachi is the easiest balance of food, buses, and evening walks." },
  { id: "stay-osaka", city: "Osaka", area: "Namba or Umeda", nights: 4, days: "Days 14-17", estimatedLowPerNight: 11000, estimatedMidPerNight: 20000, estimatedHighPerNight: 35000, note: "Namba keeps Dotonbori and late food close; Umeda is cleaner for trains." },
  { id: "stay-hiroshima", city: "Hiroshima", area: "Hondori or Hiroshima Station", nights: 3, days: "Days 18-20", estimatedLowPerNight: 9500, estimatedMidPerNight: 17000, estimatedHighPerNight: 30000, note: "Hondori is easier for evenings; station area is smoother for Miyajima and onward trains." },
  { id: "stay-kanazawa", city: "Kanazawa / Takayama", area: "Kanazawa Korinbo and Takayama old town", nights: 4, days: "Days 21-24", estimatedLowPerNight: 10000, estimatedMidPerNight: 19000, estimatedHighPerNight: 34000, note: "Split nights if you want Takayama after the tour buses leave." },
  { id: "stay-hokkaido", city: "Hokkaido", area: "Sapporo", nights: 4, days: "Days 25-28", estimatedLowPerNight: 10000, estimatedMidPerNight: 19000, estimatedHighPerNight: 34000, note: "Cooler September weather and food-heavy city days.", branch: "hokkaido" },
  { id: "stay-kyushu", city: "Kyushu", area: "Fukuoka / Yufuin", nights: 4, days: "Days 25-28", estimatedLowPerNight: 10000, estimatedMidPerNight: 20000, estimatedHighPerNight: 38000, note: "Better if you want ramen, onsen towns, and a warmer southern finish.", branch: "kyushu" },
  { id: "stay-tokyo-2", city: "Tokyo", area: "Tokyo Station or Ueno", nights: 2, days: "Days 29-30", estimatedLowPerNight: 12000, estimatedMidPerNight: 21000, estimatedHighPerNight: 36000, note: "Keep the last stay practical for shopping, laundry, and airport movement." },
];

export const routeMoves: RouteMove[] = [
  { id: "move-tokyo-fuji", from: "Tokyo", to: "Fuji / Hakone", day: 7, mode: "train or highway bus", duration: "2-3 hr", estimatedLow: 2500, estimatedMid: 4500, estimatedHigh: 8000, note: "Pick Kawaguchiko for Fuji views or Hakone for onsen logistics." },
  { id: "move-fuji-kyoto", from: "Fuji / Hakone", to: "Kyoto", day: 9, mode: "train + Shinkansen", duration: "3.5-4.5 hr", estimatedLow: 10500, estimatedMid: 14500, estimatedHigh: 19000, note: "This can be your first big Shinkansen day if you route through Mishima or Odawara." },
  { id: "move-kyoto-osaka", from: "Kyoto", to: "Osaka", day: 14, mode: "local train", duration: "30-45 min", estimatedLow: 600, estimatedMid: 900, estimatedHigh: 1500, note: "Simple move; do not over-plan this one." },
  { id: "move-osaka-hiroshima", from: "Osaka", to: "Hiroshima", day: 18, mode: "Shinkansen", duration: "1.5-2 hr", estimatedLow: 8000, estimatedMid: 10500, estimatedHigh: 14500, note: "Good place to reserve seats if travelling with luggage." },
  { id: "move-hiroshima-kanazawa", from: "Hiroshima", to: "Kanazawa", day: 21, mode: "Shinkansen + limited express", duration: "4.5-5.5 hr", estimatedLow: 15000, estimatedMid: 21000, estimatedHigh: 28000, note: "Longer transfer day. Keep the evening easy." },
  { id: "move-kanazawa-hokkaido", from: "Kanazawa", to: "Sapporo", day: 25, mode: "train + flight", duration: "4-6 hr", estimatedLow: 14000, estimatedMid: 26000, estimatedHigh: 42000, note: "Flying is the practical option for this branch.", branch: "hokkaido" },
  { id: "move-kanazawa-kyushu", from: "Kanazawa", to: "Fukuoka", day: 25, mode: "train or flight", duration: "5-7 hr", estimatedLow: 15000, estimatedMid: 25000, estimatedHigh: 39000, note: "Train is satisfying but long; flight saves energy.", branch: "kyushu" },
  { id: "move-hokkaido-tokyo", from: "Sapporo", to: "Tokyo", day: 29, mode: "flight", duration: "3-4 hr door to door", estimatedLow: 10000, estimatedMid: 20000, estimatedHigh: 36000, note: "Build in weather flexibility.", branch: "hokkaido" },
  { id: "move-kyushu-tokyo", from: "Fukuoka", to: "Tokyo", day: 29, mode: "flight or Shinkansen", duration: "3-6 hr", estimatedLow: 11000, estimatedMid: 22000, estimatedHigh: 36000, note: "Flight is usually easier unless you specifically want the train day.", branch: "kyushu" },
];

export const dailyCosts: DailyCost[] = [
  { city: "Tokyo", days: [1, 2, 3, 4, 5, 6, 29, 30], localTransitLow: 700, localTransitMid: 1100, localTransitHigh: 1800, foodLow: 3500, foodMid: 6500, foodHigh: 11000 },
  { city: "Fuji / Hakone", days: [7, 8], localTransitLow: 900, localTransitMid: 1700, localTransitHigh: 3000, foodLow: 3500, foodMid: 6500, foodHigh: 12000 },
  { city: "Kyoto", days: [9, 10, 11, 12, 13], localTransitLow: 700, localTransitMid: 1200, localTransitHigh: 2200, foodLow: 3200, foodMid: 6000, foodHigh: 10500 },
  { city: "Osaka", days: [14, 15, 16, 17], localTransitLow: 700, localTransitMid: 1200, localTransitHigh: 2200, foodLow: 3600, foodMid: 7000, foodHigh: 12000 },
  { city: "Hiroshima", days: [18, 19, 20], localTransitLow: 700, localTransitMid: 1300, localTransitHigh: 2400, foodLow: 3200, foodMid: 6000, foodHigh: 10000 },
  { city: "Kanazawa / Takayama", days: [21, 22, 23, 24], localTransitLow: 800, localTransitMid: 1600, localTransitHigh: 2800, foodLow: 3300, foodMid: 6200, foodHigh: 11000 },
  { city: "Hokkaido", days: [25, 26, 27, 28], localTransitLow: 900, localTransitMid: 1700, localTransitHigh: 3000, foodLow: 3500, foodMid: 6800, foodHigh: 12000, branch: "hokkaido" },
  { city: "Kyushu", days: [25, 26, 27, 28], localTransitLow: 900, localTransitMid: 1700, localTransitHigh: 3200, foodLow: 3400, foodMid: 6500, foodHigh: 11500, branch: "kyushu" },
];

export const specialExperiences: SpecialExperience[] = [
  { id: "special-ryokan", title: "Ryokan / onsen night", city: "Fuji / Hakone", category: "lodging", estimatedLow: 22000, estimatedMid: 45000, estimatedHigh: 85000, note: "Worth protecting in the budget. This gives the trip some quiet after Tokyo." },
  { id: "special-shinkansen", title: "Shinkansen experience", city: "Fuji to Kyoto or Osaka to Hiroshima", category: "transport", estimatedLow: 10000, estimatedMid: 14500, estimatedHigh: 21000, note: "Pick at least one route where you are not rushing." },
  { id: "special-usj", title: "Universal Studios Japan", city: "Osaka", category: "attractions", estimatedLow: 8600, estimatedMid: 15000, estimatedHigh: 32000, note: "Budget jumps fast if Express Pass enters the chat." },
  { id: "special-ghibli", title: "Ghibli Museum", city: "Tokyo", category: "attractions", estimatedLow: 1000, estimatedMid: 1000, estimatedHigh: 2500, note: "Cheap ticket, hard reservation. Book early." },
  { id: "special-teamlab", title: "teamLab Planets", city: "Tokyo", category: "attractions", estimatedLow: 3800, estimatedMid: 4500, estimatedHigh: 5500, note: "Good rainy-day swap if you can get a time slot." },
  { id: "special-daytrips", title: "Day trips buffer", city: "Nara / Miyajima / Hakone", category: "transport", estimatedLow: 4000, estimatedMid: 9000, estimatedHigh: 16000, note: "A practical cushion for ferries, buses, and local trains." },
  { id: "special-shopping", title: "Shopping and misc.", city: "All regions", category: "shopping/miscellaneous", estimatedLow: 25000, estimatedMid: 70000, estimatedHigh: 160000, note: "Snacks, stationery, clothes, luggage surprises." },
];

const a = (
  id: string,
  day: number,
  title: string,
  city: string,
  region: string,
  category: Category,
  priority: number,
  description: string,
  low: number,
  mid: number,
  high: number,
  visitDuration: string,
  durationHours: number,
  travelTimeFromBase: string,
  travelMinutesFromBase: number,
  suggestedTimeOfDay: TimeOfDay,
  energyLevel: EnergyLevel,
  bookingRequired: BookingRequired,
  weatherSensitive: boolean,
  backupOption: string,
  logisticsNotes: string,
  branch?: TripBranch,
): Activity => {
  const image = placeImageCatalog[id] ?? {
    imageUrl: "",
    imageAlt: `Generated scenic placeholder for ${title}.`,
    imageSearchQuery: `${title} ${city} Japan`,
  };

  return {
    id,
    day,
    title,
    city,
    region,
    category,
    priority,
    description,
    ...image,
    estimatedCostLow: low,
    estimatedCostMid: mid,
    estimatedCostHigh: high,
    visitDuration,
    durationHours,
    travelTimeFromBase,
    travelMinutesFromBase,
    suggestedTimeOfDay,
    energyLevel,
    bookingRequired,
    weatherSensitive,
    backupOption,
    notes: "",
    logisticsNotes,
    googleMapsQuery: `${title} ${city} Japan`,
    isBooked: false,
    isCompleted: false,
    branch,
  };
};

export const defaultActivities: Activity[] = [
  a("tokyo-shibuya", 1, "Shibuya Crossing and Center Gai", "Tokyo", "Kanto", "Must See", 1, "This is the Tokyo moment. Crowds, lights, screens, and the feeling that the city is moving faster than you.", 0, 1000, 2500, "2-3 hr", 2.5, "15-25 min from Shinjuku or Ginza", 25, "evening", "medium", "no", true, "Shinjuku neon walk", "Best after dark. Keep dinner flexible nearby."),
  a("tokyo-meiji", 1, "Meiji Shrine and Harajuku", "Tokyo", "Kanto", "Nice To Have", 2, "A calm first-day reset before the city gets loud again.", 0, 1000, 2500, "2 hr", 2, "10-20 min from Shinjuku", 20, "morning", "light", "no", true, "Yoyogi Park cafes", "Good first morning if jet lag wakes you early."),
  a("tokyo-asakusa", 2, "Senso-ji and Asakusa lanes", "Tokyo", "Kanto", "Must See", 1, "Old Tokyo energy, snack stalls, and a temple approach that still feels like a proper arrival.", 0, 1500, 3500, "2-3 hr", 2.5, "30-40 min from Shinjuku", 40, "morning", "medium", "no", true, "Tokyo Skytree shops", "Go early or after dinner to avoid the thickest crowd."),
  a("tokyo-akihabara", 2, "Akihabara arcades and hobby shops", "Tokyo", "Kanto", "Nice To Have", 3, "Good for games, figures, electronics, and wandering without pretending it is subtle.", 1000, 5000, 16000, "2-4 hr", 3, "20-30 min by train", 30, "afternoon", "medium", "no", false, "Nakano Broadway", "Set a spending cap before you start browsing."),
  a("tokyo-tsukiji", 3, "Tsukiji Outer Market breakfast", "Tokyo", "Kanto", "Must See", 2, "Go hungry, graze slowly, and leave before the midday crowd squeezes the lanes.", 2500, 4500, 9000, "2 hr", 2, "10-25 min from Ginza/Shinjuku", 25, "morning", "light", "no", true, "Ginza depachika food halls", "Earlier is better; many stalls wind down by afternoon."),
  a("tokyo-teamlab", 3, "teamLab Planets", "Tokyo", "Kanto", "Nice To Have", 3, "A polished indoor break when Tokyo weather gets sticky or rainy.", 3800, 4500, 5500, "1.5-2 hr", 2, "25-40 min to Toyosu", 40, "afternoon", "light", "yes", false, "Toyosu Market / small Planets garden", "Timed tickets. Do not stack this with a tight dinner booking."),
  a("tokyo-ghibli", 4, "Ghibli Museum, Mitaka", "Tokyo", "Kanto", "Extra", 4, "Small, charming, and worth it if animation is part of why Japan is on the list.", 1000, 1000, 2500, "2-3 hr", 2.5, "35-55 min to Mitaka", 55, "midday", "light", "yes", true, "Kichijoji and Inokashira Park", "Tickets are the hard part, not the price."),
  a("tokyo-shinjuku", 4, "Shinjuku evening: Omoide Yokocho and Golden Gai", "Tokyo", "Kanto", "Non-Negotiable", 1, "Tiny alleys, counter seats, and a night that feels very different from daytime Tokyo.", 3500, 7000, 13000, "3-4 hr", 3.5, "0-20 min depending on base", 20, "evening", "medium", "optional", false, "Ebisu yokocho-style dinner", "Go for food and atmosphere, not a checklist."),
  a("tokyo-ueno", 5, "Ueno Park museums and Ameyoko", "Tokyo", "Kanto", "Nice To Have", 3, "A flexible museum-and-market day that works well if the weather turns.", 1000, 3500, 8000, "3-5 hr", 4, "20-30 min by train", 30, "midday", "medium", "optional", false, "Tokyo National Museum only", "Pick one museum, then leave time for wandering."),
  a("tokyo-daikanyama", 6, "Daikanyama, Nakameguro, and design stores", "Tokyo", "Kanto", "Extra", 4, "A slower Tokyo day for coffee, books, clothes, and noticing how the city styles itself.", 1500, 6000, 18000, "3-5 hr", 4, "15-30 min by train", 30, "afternoon", "light", "no", true, "Shimokitazawa vintage shops", "Keep this loose before the Fuji move."),
  a("fuji-lake", 7, "Lake Kawaguchiko Fuji viewpoints", "Kawaguchiko", "Chubu", "Non-Negotiable", 1, "This is the postcard attempt. If Fuji is hiding, the lake still gives the trip space to breathe.", 1500, 3500, 7000, "3-5 hr", 4, "10-30 min local bus from lake hotels", 30, "morning", "medium", "optional", true, "Itchiku Kubota Art Museum", "Clouds decide the day. Check visibility before committing."),
  a("fuji-onsen", 7, "Ryokan or onsen evening", "Hakone / Kawaguchiko", "Chubu", "Non-Negotiable", 1, "A proper quiet night after Tokyo. Put the phone down for this one.", 3000, 12000, 30000, "2-4 hr", 3, "At or near lodging", 10, "evening", "light", "yes", false, "Private bath add-on or public day onsen", "Confirm tattoo rules if relevant."),
  a("fuji-chureito", 8, "Chureito Pagoda view", "Fujiyoshida", "Chubu", "Nice To Have", 2, "Worth it for the view if the weather cooperates. Skip it if Fuji is fully hidden.", 0, 1500, 3500, "2-3 hr", 2.5, "35-60 min from Kawaguchiko", 60, "morning", "medium", "no", true, "Lake Kawaguchiko museum or cafe", "Check visibility before climbing the stairs."),
  a("fuji-hakone", 8, "Hakone loop or Fuji ropeway", "Hakone / Kawaguchiko", "Chubu", "Nice To Have", 2, "Boats, ropeways, mountain air, and enough transit variety to make the travel feel like part of the day.", 3500, 6500, 11000, "5-7 hr", 6, "30-70 min depending on base", 70, "morning", "heavy", "optional", true, "Hakone Open-Air Museum", "Avoid forcing the full loop in bad weather."),
  a("kyoto-fushimi", 9, "Fushimi Inari early gates", "Kyoto", "Kansai", "Must See", 1, "Worth doing early before Kyoto gets crowded. Even a partial climb is enough.", 0, 500, 1500, "2-3 hr", 2.5, "10-20 min from Kyoto Station", 20, "early morning", "medium", "no", true, "Tofuku-ji", "Go before breakfast or late evening."),
  a("kyoto-gion", 9, "Gion, Yasaka, and Higashiyama walk", "Kyoto", "Kansai", "Must See", 1, "Lanterns, lanes, temple roofs, and the Kyoto everyone pictures.", 0, 2000, 5000, "3-4 hr", 3.5, "10-25 min from Kawaramachi", 25, "evening", "medium", "no", true, "Nishiki Market dinner", "Respect private streets and photo rules."),
  a("kyoto-kiyomizu", 10, "Kiyomizu-dera and Sannenzaka", "Kyoto", "Kansai", "Must See", 1, "Classic Kyoto, best before the souvenir lanes clog up.", 500, 2000, 4500, "3 hr", 3, "20-35 min by bus/taxi", 35, "morning", "medium", "no", true, "Kodai-ji", "Start high and walk downhill."),
  a("kyoto-arashiyama", 11, "Arashiyama bamboo, river, and temples", "Kyoto", "Kansai", "Must See", 2, "Go early for the bamboo, stay for the river and quieter temple corners.", 1000, 3500, 7000, "4-6 hr", 5, "25-45 min by train", 45, "morning", "heavy", "no", true, "Okochi Sanso or Tenryu-ji only", "The bamboo is short; do not make it the whole reason for the trip."),
  a("kyoto-philosopher", 12, "Nanzen-ji and Philosopher's Path", "Kyoto", "Kansai", "Nice To Have", 2, "A quieter east-side day with enough room to slow down.", 500, 2500, 6000, "3-5 hr", 4, "25-40 min by bus/taxi", 40, "morning", "medium", "no", true, "Kyoto National Museum", "Good day to add a rest block if feet are cooked."),
  a("kyoto-nishiki", 13, "Nishiki Market and shopping lanes", "Kyoto", "Kansai", "Nice To Have", 3, "Easy food, small purchases, and a useful low-effort reset before Osaka.", 2000, 5000, 12000, "2-4 hr", 3, "Walkable from Kawaramachi", 15, "midday", "light", "no", false, "Teramachi covered arcade", "Covered arcades make this a strong rainy-day option."),
  a("osaka-dotonbori", 14, "Dotonbori and Namba food crawl", "Osaka", "Kansai", "Non-Negotiable", 1, "Osaka at full volume. Come hungry and do not turn dinner into one reservation.", 3500, 7500, 14000, "3-5 hr", 4, "Walkable from Namba / 15 min from Umeda", 15, "evening", "medium", "no", false, "Shinsekai kushikatsu", "Snack in rounds, not all at once."),
  a("nara-park", 15, "Nara Park and Todai-ji", "Nara", "Kansai", "Non-Negotiable", 1, "Easy day trip, giant temple, deer chaos, and a clear change of pace from Osaka.", 2000, 4500, 9000, "5-7 hr", 6, "45-60 min train from Osaka", 60, "morning", "heavy", "no", true, "Osaka Aquarium", "Go early and keep snacks away from the deer until you are ready."),
  a("osaka-usj", 16, "Universal Studios Japan", "Osaka", "Kansai", "Extra", 4, "Big-ticket fun if theme parks are part of your Japan fantasy.", 8600, 15000, 32000, "8-10 hr", 9, "20-35 min by train", 35, "early morning", "heavy", "yes", true, "Osaka Aquarium and Tempozan", "Book ahead and treat this as the whole day."),
  a("osaka-castle", 17, "Osaka Castle Park and Kuromon Market", "Osaka", "Kansai", "Nice To Have", 3, "A lighter city day before heading west.", 1000, 4000, 9000, "3-5 hr", 4, "15-30 min by train", 30, "midday", "medium", "no", true, "Umeda Sky Building", "Castle exterior and park are often enough."),
  a("hiroshima-peace", 18, "Peace Memorial Park and Museum", "Hiroshima", "Chugoku", "Non-Negotiable", 1, "Heavy, important, and worth giving proper time instead of squeezing it between snacks.", 200, 1000, 2500, "3-4 hr", 3.5, "10-20 min by tram", 20, "afternoon", "medium", "optional", false, "Hiroshima Museum of Art", "Do this after arrival, then keep the evening gentle."),
  a("hiroshima-dome", 18, "Atomic Bomb Dome riverside walk", "Hiroshima", "Chugoku", "Must See", 1, "Do this slowly. It is close to the museum, but it should not feel like a pass-by.", 0, 500, 1500, "45-75 min", 1, "10-20 min by tram", 20, "afternoon", "light", "no", true, "Hiroshima Orizuru Tower", "Pair with Peace Park, then keep the evening quiet."),
  a("miyajima", 19, "Miyajima and Itsukushima Shrine", "Miyajima", "Chugoku", "Must See", 1, "A ferry day with water, shrine views, deer, and enough walking to feel like a small escape.", 2500, 6000, 12000, "6-8 hr", 7, "60-80 min train + ferry", 80, "morning", "heavy", "optional", true, "Hiroshima covered shopping arcade", "Check tide times if the floating gate photo matters."),
  a("hiroshima-okonomiyaki", 20, "Hiroshima okonomiyaki night", "Hiroshima", "Chugoku", "Must See", 2, "Dinner at the counter is the point. Watch the layers get built.", 1800, 3500, 6500, "2 hr", 2, "10-20 min local transit", 20, "evening", "light", "optional", false, "Ekimae food halls", "Great low-effort night after Miyajima."),
  a("kanazawa-garden", 21, "Kenrokuen and Kanazawa Castle", "Kanazawa", "Hokuriku", "Must See", 2, "A refined garden day after the big-city run.", 500, 2500, 6000, "3-4 hr", 3.5, "10-20 min by bus/taxi", 20, "morning", "medium", "no", true, "21st Century Museum", "Works best before or after peak tour bus hours."),
  a("kanazawa-districts", 22, "Higashi Chaya and Omicho Market", "Kanazawa", "Hokuriku", "Nice To Have", 3, "Tea houses, seafood bowls, gold leaf sweets, and a city that rewards slow walking.", 2500, 5500, 12000, "3-5 hr", 4, "10-25 min from Korinbo", 25, "midday", "medium", "no", true, "Covered shopping arcades", "Do market earlier; chaya district later."),
  a("takayama-old-town", 23, "Takayama old town and morning market", "Takayama", "Chubu", "Nice To Have", 2, "Wooden streets, mountain-town pacing, and a softer contrast to Kyoto.", 1500, 4500, 10000, "4-6 hr", 5, "2 hr bus/train from Kanazawa", 120, "morning", "heavy", "optional", true, "Kanazawa craft day", "This is a long day if you do not overnight."),
  a("takayama-shirakawa", 24, "Shirakawa-go thatched village", "Shirakawa-go", "Chubu", "Extra", 4, "Beautiful if you want a countryside detour. It is also a logistics day, not a quick pop-in.", 4000, 8000, 15000, "5-7 hr", 6, "50-90 min by bus from Takayama", 90, "morning", "heavy", "optional", true, "Takayama old town slow day", "Reserve buses if travelling at busy times."),
  a("takayama-onsen", 24, "Hida beef dinner or small onsen stop", "Takayama", "Chubu", "Extra", 4, "A treat day if the budget has room.", 4000, 9000, 18000, "2-3 hr", 2.5, "Walkable if staying central", 15, "evening", "light", "optional", false, "Casual izakaya near station", "Keep it simple before the branch transfer."),
  a("hokkaido-sapporo", 25, "Sapporo ramen and Odori Park", "Sapporo", "Hokkaido", "Nice To Have", 2, "Cooler air, easy food, and a clean landing after the long transfer.", 2500, 5500, 11000, "3-4 hr", 3.5, "10-20 min from central Sapporo", 20, "evening", "light", "no", true, "Sapporo Station food floors", "Good low-pressure arrival night.", "hokkaido"),
  a("hokkaido-otaru", 26, "Otaru canal day trip", "Otaru", "Hokkaido", "Nice To Have", 2, "Canal walks, glass shops, sushi, and a gentle day by the water.", 2500, 6500, 13000, "5-7 hr", 6, "35-50 min train from Sapporo", 50, "morning", "medium", "no", true, "Sapporo museums and cafes", "Bring a layer; evenings can feel different up here.", "hokkaido"),
  a("hokkaido-biei", 27, "Biei or Furano countryside", "Biei / Furano", "Hokkaido", "Extra", 4, "Longer logistics, but it gives the trip open space and early autumn scenery.", 7000, 14000, 26000, "8-10 hr", 9, "2-3 hr each way from Sapporo", 180, "early morning", "heavy", "optional", true, "Moerenuma Park", "Only do this if you want a big countryside day.", "hokkaido"),
  a("hokkaido-noboribetsu", 27, "Noboribetsu Jigokudani onsen day", "Noboribetsu", "Hokkaido", "Extra", 4, "Steam, sulfur, and a very different Hokkaido mood. Better if you actually want onsen time.", 4500, 10000, 22000, "6-8 hr", 7, "90-120 min from Sapporo", 120, "morning", "heavy", "optional", true, "Jozankei onsen day trip", "Do this instead of Biei, not alongside it."),
  a("hokkaido-rest", 28, "Sapporo rest, shopping, and soup curry", "Sapporo", "Hokkaido", "Nice To Have", 3, "A useful softer day before returning to Tokyo.", 2500, 7000, 15000, "3-5 hr", 4, "Central Sapporo", 15, "flexible", "light", "no", false, "Onsen day trip near Jozankei", "Protect sleep and laundry here.", "hokkaido"),
  a("kyushu-fukuoka", 25, "Fukuoka yatai and canal area", "Fukuoka", "Kyushu", "Nice To Have", 2, "A food-first landing with easy nights and a different rhythm from Tokyo or Osaka.", 3000, 7000, 13000, "3-4 hr", 3.5, "10-20 min from Hakata or Tenjin", 20, "evening", "light", "no", false, "Hakata Station food floors", "Yatai are weather-dependent and not every stall feels welcoming.", "kyushu"),
  a("kyushu-nagasaki", 26, "Nagasaki harbor and history day", "Nagasaki", "Kyushu", "Extra", 4, "A longer day, but the harbor city has a different story from the rest of the trip.", 5000, 11000, 22000, "7-9 hr", 8, "2-2.5 hr by train from Fukuoka", 150, "morning", "heavy", "optional", true, "Dazaifu shrine and museum", "Best as an overnight if you want it to feel unrushed.", "kyushu"),
  a("kyushu-dazaifu", 26, "Dazaifu Tenmangu and Kyushu National Museum", "Dazaifu", "Kyushu", "Nice To Have", 3, "A compact day trip with shrine, museum, and snack-street pacing.", 1500, 4500, 9000, "4-6 hr", 5, "45-60 min from Fukuoka", 60, "morning", "medium", "no", true, "Fukuoka Asian Art Museum", "Good rainy option if you lean into the museum.", "kyushu"),
  a("kyushu-beppu", 27, "Beppu steam and onsen town", "Beppu", "Kyushu", "Extra", 4, "Go for steam, baths, and the strange landscape. It is not a light transit day.", 6000, 13000, 26000, "7-9 hr", 8, "2-2.5 hr each way from Fukuoka", 150, "morning", "heavy", "optional", true, "Yufuin onsen town", "Choose Beppu or Yufuin unless you add an overnight.", "kyushu"),
  a("kyushu-yufuin", 27, "Yufuin onsen town", "Yufuin", "Kyushu", "Extra", 4, "Quiet streets, mountain views, and one more chance for bath time.", 6000, 14000, 30000, "6-8 hr", 7, "2-2.5 hr each way from Fukuoka", 150, "morning", "heavy", "optional", true, "Fukuoka shopping and cafes", "Best as an overnight if you can spare it.", "kyushu"),
  a("kyushu-rest", 28, "Fukuoka rest, Ohori Park, and ramen", "Fukuoka", "Kyushu", "Nice To Have", 3, "Easy park time, one final bowl, and a soft landing before Tokyo.", 2500, 6500, 14000, "3-5 hr", 4, "10-25 min local transit", 25, "flexible", "light", "no", true, "Canal City or covered arcades", "Keep this flexible for weather or fatigue.", "kyushu"),
  a("tokyo-buffer-shop", 29, "Tokyo buffer: shopping and laundry", "Tokyo", "Kanto", "Must See", 2, "The practical day that saves the trip from becoming a packing panic.", 3000, 12000, 40000, "3-6 hr", 5, "Depends on final hotel", 25, "afternoon", "light", "no", false, "Hotel rest and convenience-store dinner", "Do not schedule a hard-to-rebook activity here."),
  a("tokyo-final", 30, "Final Tokyo meal and airport buffer", "Tokyo", "Kanto", "Non-Negotiable", 1, "One good meal, one last walk, then leave with breathing room.", 2500, 7000, 16000, "2-4 hr", 3, "30-90 min to airport depending on hotel", 90, "flexible", "medium", "optional", true, "Airport meal and shopping", "Keep bags, transit, and weather in mind."),
];
