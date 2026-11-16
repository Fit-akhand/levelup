// What Level Up Plus costs and what it unlocks. This is the ONE place to change prices.
// IMPORTANT: prices live here, on the server side of the rules. The browser only sends a plan id;
// the server looks the price up itself, so nobody can pay ₹1 for a yearly pass.
//
// These are ONE-TIME passes that end on their own. There is no auto-renewal, so nobody (and no
// parent) can be charged again without choosing to buy again.

export type PlanId = "plus_month" | "plus_quarter" | "plus_year";

export interface PlanDef {
  id: PlanId;
  name: string;
  days: number; // how long the pass lasts
  pricePaise: number; // 100 paise = ₹1 (Razorpay works in paise)
}

export const PLANS: PlanDef[] = [
  { id: "plus_month", name: "1 month", days: 30, pricePaise: 2900 },
  { id: "plus_quarter", name: "3 months", days: 90, pricePaise: 6900 },
  { id: "plus_year", name: "1 year", days: 365, pricePaise: 19900 },
];

export function planById(id: unknown): PlanDef | undefined {
  return PLANS.find((p) => p.id === id);
}

export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return `₹${Number.isInteger(rupees) ? rupees : rupees.toFixed(2)}`;
}

// What Plus unlocks (shown on the pricing page and the paywall).
export const PLUS_FEATURES = [
  "7-day Indian meal plans (vegetarian, egg or non-vegetarian)",
  "Meals that fit your daily food budget",
  "Allergy filters: peanuts, dairy and gluten",
  "Shuffle meals any time",
  "New features first as we add them",
];

// What stays free, always.
export const FREE_FEATURES = [
  "Personal gym, home and yoga workout plans",
  "Workout player with rest timers",
  "XP, levels, streaks and badges",
  "The full exercise library with demos",
];
