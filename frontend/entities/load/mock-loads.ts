import { BrokerProfile, FreightLoad } from "@/entities/load/types";

// Static pools used to generate realistic mock freight rows.
// Later these values will come from backend load board integrations.
const pickups = ["Atlanta, GA", "Dallas, TX", "Chicago, IL", "Columbus, OH", "Phoenix, AZ", "Charlotte, NC", "Memphis, TN", "Denver, CO"];
const deliveries = ["Nashville, TN", "Orlando, FL", "Kansas City, MO", "Salt Lake City, UT", "Reno, NV", "Allentown, PA", "Savannah, GA", "Seattle, WA"];
const brokers = ["Apex Freight", "BlueLine Logistics", "Northstar Brokers", "Vector Load Group", "Summit Transit", "Cobalt Freight"];
const dispatchers = ["M. Carter", "N. Patel", "D. Walker", "Unassigned", "A. Ramos"];
const equipment = ["Dry Van", "Reefer", "Flatbed", "Power Only", "Step Deck"] as const;
const sources = ["DAT", "Truckstop", "Direct", "Email", "Private"] as const;

// Main mock dataset for the realtime load table.
// Five starter rows keep the screen readable until live mock loads arrive.
export const mockLoads: FreightLoad[] = Array.from({ length: 5 }, (_, index) => {
  // Deterministic math gives each row different values without unstable random data.
  const miles = 240 + ((index * 73) % 1850);
  const rate = 900 + ((index * 137) % 5400);
  // RPM means rate per mile, one of the fastest fields dispatchers scan.
  const rpm = Number((rate / miles).toFixed(2));
  const ageMinutes = 1 + ((index * 5) % 180);
  const aiScore = 52 + ((index * 11) % 48);
  // A load is considered hot when RPM is strong or AI score is high.
  const hot = rpm > 2.75 || aiScore > 88;
  const receivedAt = Date.now() - ageMinutes * 60_000;

  return {
    id: `LD-${String(912000 + index)}`,
    ageMinutes,
    pickup: pickups[index % pickups.length],
    delivery: deliveries[(index * 3) % deliveries.length],
    rpm,
    miles,
    deadhead: 12 + ((index * 9) % 190),
    weight: 8000 + ((index * 1400) % 36500),
    equipment: equipment[index % equipment.length],
    broker: brokers[index % brokers.length],
    company: `${brokers[index % brokers.length]} LLC`,
    phone: `(404) 555-${String(1000 + index).slice(-4)}`,
    rate,
    postedTime: new Date(Date.now() - ageMinutes * 60_000).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    }),
    source: sources[index % sources.length],
    status: hot ? "new" : index % 7 === 0 ? "claimed" : index % 5 === 0 ? "watching" : "new",
    dispatcher: dispatchers[index % dispatchers.length],
    aiScore,
    hot,
    receivedAt,
    updatedAt: Date.now() - index * 700
  };
});

// Mock broker intelligence for the side drawer.
// In a real app this would likely be fetched when a dispatcher selects a load.
export const mockBrokerProfiles: Record<string, BrokerProfile> = Object.fromEntries(
  brokers.map((broker, index) => [
    broker,
    {
      broker,
      company: `${broker} LLC`,
      score: 72 + index * 4,
      daysToPay: 18 + index * 3,
      phone: `(404) 555-${2000 + index}`,
      email: `ops@${broker.toLowerCase().replaceAll(" ", "")}.com`,
      laneHistory: ["GA -> TN", "TX -> MO", "IL -> PA", "AZ -> NV"].slice(0, 3),
      notes: ["Fast confirmation on short-haul lanes", "Rate moves 4-8% near cutoff", "Verify appointment windows before call"],
      previousInteractions: ["Called yesterday, no answer", "Won similar lane at $2.82 RPM", "Prefers text confirmation after booking"]
    }
  ])
);

// Simulates a WebSocket patch update by modifying exactly one load.
// The UI uses this to pulse changed rows and create activity notifications.
export function patchRandomLoad(loads: FreightLoad[]): FreightLoad[] {
  const index = Math.floor(Math.random() * loads.length);
  const target = loads[index];
  // Rate movement imitates market changes coming from live load boards.
  const rateDelta = [-150, -75, 50, 125, 200][Math.floor(Math.random() * 5)];
  const nextRate = Math.max(650, target.rate + rateDelta);
  const patched: FreightLoad = {
    ...target,
    rate: nextRate,
    rpm: Number((nextRate / target.miles).toFixed(2)),
    aiScore: Math.min(99, Math.max(35, target.aiScore + Math.floor(Math.random() * 7) - 2)),
    hot: nextRate / target.miles > 2.75 || target.aiScore > 88,
    updatedAt: Date.now()
  };

  // Return a new array so React state updates correctly.
  // Only the patched object is replaced to keep rendering efficient.
  const next = loads.slice();
  next[index] = patched;
  return next;
}

// Generates a brand-new incoming load for the mock realtime stream.
// This models the backend sending a new_load WebSocket event.
export function createIncomingMockLoad(sequence: number): FreightLoad {
  const index = mockLoads.length + sequence;
  const miles = 220 + ((index * 89) % 1680);
  const rate = 950 + ((index * 173) % 5200);
  const rpm = Number((rate / miles).toFixed(2));
  const aiScore = 58 + ((index * 13) % 42);
  const hot = rpm > 2.75 || aiScore > 88;
  const receivedAt = Date.now();

  return {
    id: `LD-LIVE-${String(1000 + sequence)}`,
    ageMinutes: 0,
    pickup: pickups[index % pickups.length],
    delivery: deliveries[(index * 5) % deliveries.length],
    rpm,
    miles,
    deadhead: 8 + ((index * 11) % 160),
    weight: 7000 + ((index * 1700) % 38000),
    equipment: equipment[index % equipment.length],
    broker: brokers[index % brokers.length],
    company: `${brokers[index % brokers.length]} LLC`,
    phone: `(404) 555-${String(7000 + sequence).slice(-4)}`,
    rate,
    postedTime: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    }),
    source: sources[index % sources.length],
    status: "new",
    dispatcher: "Unassigned",
    aiScore,
    hot,
    receivedAt,
    updatedAt: receivedAt
  };
}
