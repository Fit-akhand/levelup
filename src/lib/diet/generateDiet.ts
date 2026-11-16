// The meal planner: targets + preferences in, a 7-day Indian meal plan out.
//
// How it works: for each day it TRIES many random combinations of one meal per slot, scales the
// portions of each meal to hit the calorie target, scores every attempt, and keeps the best.
// "Score" = how far from the calorie target + protein shortfall + cost over budget + repeats of
// meals used earlier in the week. The randomness is seeded, so the same inputs give the same plan.
import type {
  Allergen, Budget, DietDay, DietPlan, DietPref, DietTargets, Food, MealCombo, MealSlot,
  PlannedFood, PlannedMeal,
} from "../types.ts";
import { hashString, mulberry32 } from "../engine/rng.ts";

// Approximate rupees per day the user wants to stay under (food prices vary by city).
export const BUDGET_CAP: Record<Budget, number> = { low: 150, medium: 250, high: 400 };

// Things we count ("3 roti") rather than measure ("1.5 katori dal").
const COUNTED_UNITS = new Set(["roti", "egg", "idli", "dosa", "chilla", "banana", "date", "slice", "tbsp", "omelette"]);

const DIET_RANK: Record<DietPref, number> = { veg: 0, egg: 1, nonveg: 2 };
const ATTEMPTS = 300; // random tries per day
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.8;

export interface DietInput {
  targets: DietTargets;
  diet: DietPref;
  budget: Budget;
  avoid: Allergen[];
  variant?: number; // change this to "shuffle" the plan
}

interface Info {
  combo: MealCombo;
  diet: DietPref;
  allergens: Set<Allergen>;
  baseKcal: number;
}

// Works out a combo's diet type (its strictest food), allergens and base calories.
function describe(combo: MealCombo, foodById: Map<string, Food>): Info {
  let diet: DietPref = "veg";
  const allergens = new Set<Allergen>();
  let baseKcal = 0;
  for (const it of combo.items) {
    const food = foodById.get(it.foodId);
    if (!food) throw new Error(`Unknown food "${it.foodId}" in meal "${combo.id}"`);
    if (DIET_RANK[food.diet] > DIET_RANK[diet]) diet = food.diet;
    food.allergens.forEach((a) => allergens.add(a));
    baseKcal += food.kcal * it.qty;
  }
  return { combo, diet, allergens, baseKcal };
}

// "3 × Roti (whole wheat)"  for counted items,  "1.5 katori Dal (toor / moong)"  for measured ones.
function portionLabel(food: Food, qty: number): string {
  if (COUNTED_UNITS.has(food.unit)) return `${qty} × ${food.name}`;
  return `${qty} ${qty === 1 ? food.unit : food.unitPlural} ${food.name}`;
}

// Scale a combo's portions by `factor` (rounded to sensible portion steps) and total it up.
function scaleMeal(info: Info, factor: number, foodById: Map<string, Food>): PlannedMeal {
  const items: PlannedFood[] = [];
  let kcal = 0, protein = 0, carbs = 0, fat = 0, cost = 0;
  for (const it of info.combo.items) {
    const food = foodById.get(it.foodId)!;
    const qty = Math.max(food.step, Math.round((it.qty * factor) / food.step) * food.step);
    kcal += food.kcal * qty;
    protein += food.protein * qty;
    carbs += food.carbs * qty;
    fat += food.fat * qty;
    cost += food.cost * qty;
    items.push({
      foodId: food.id,
      name: food.name,
      qty,
      label: portionLabel(food, qty),
    });
  }
  return {
    comboId: info.combo.id,
    slot: info.combo.slot,
    name: info.combo.name,
    items,
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    cost: Math.round(cost),
  };
}

// Heavier targets need a second snack so single meals do not get unrealistically big.
function slotsFor(kcal: number): { slot: MealSlot; weight: number }[] {
  return kcal > 2400
    ? [
        { slot: "breakfast", weight: 0.22 },
        { slot: "lunch", weight: 0.28 },
        { slot: "snack", weight: 0.12 },
        { slot: "dinner", weight: 0.26 },
        { slot: "snack", weight: 0.12 },
      ]
    : [
        { slot: "breakfast", weight: 0.25 },
        { slot: "lunch", weight: 0.32 },
        { slot: "snack", weight: 0.12 },
        { slot: "dinner", weight: 0.31 },
      ];
}

export function generateDiet(input: DietInput, foods: Food[], meals: MealCombo[]): DietPlan {
  const foodById = new Map(foods.map((x) => [x.id, x]));
  const { targets, diet, budget, avoid } = input;
  const cap = BUDGET_CAP[budget];

  // Hard filters: diet type and allergens. These can never be broken.
  const allowed = meals
    .map((c) => describe(c, foodById))
    .filter((i) => DIET_RANK[i.diet] <= DIET_RANK[diet] && !avoid.some((a) => i.allergens.has(a)));

  const slots = slotsFor(targets.kcal);
  const bySlot = new Map<MealSlot, Info[]>();
  for (const s of new Set(slots.map((x) => x.slot))) bySlot.set(s, allowed.filter((i) => i.combo.slot === s));
  for (const [s, list] of bySlot) {
    if (list.length === 0) throw new Error(`No "${s}" meals available for this combination of diet and allergies`);
  }

  const rand = mulberry32(
    hashString(`${diet}|${budget}|${[...avoid].sort().join(",")}|${targets.kcal}|${input.variant ?? 0}`),
  );
  const used = new Map<string, number>(); // how many times each combo is already in the week
  const days: DietDay[] = [];

  for (let d = 1; d <= 7; d++) {
    let best: PlannedMeal[] | null = null;
    let bestScore = Infinity;

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const chosen: PlannedMeal[] = [];
      const picked = new Set<string>();
      let repeatPenalty = 0;
      let scalePenalty = 0;

      for (const { slot, weight } of slots) {
        const pool = bySlot.get(slot)!.filter((i) => !picked.has(i.combo.id));
        const list = pool.length > 0 ? pool : bySlot.get(slot)!;
        const info = list[Math.floor(rand() * list.length)];
        picked.add(info.combo.id);
        const factor = Math.min(Math.max((targets.kcal * weight) / info.baseKcal, MIN_SCALE), MAX_SCALE);
        chosen.push(scaleMeal(info, factor, foodById));
        repeatPenalty += 12 * (used.get(info.combo.id) ?? 0);
        scalePenalty += 4 * Math.abs(Math.log(factor));
      }

      const kcal = chosen.reduce((s, x) => s + x.kcal, 0);
      const protein = chosen.reduce((s, x) => s + x.protein, 0);
      const cost = chosen.reduce((s, x) => s + x.cost, 0);

      const score =
        (Math.abs(kcal - targets.kcal) / targets.kcal) * 150 + // calories close to target
        (Math.max(0, targets.proteinG - protein) / targets.proteinG) * 120 + // enough protein
        (Math.max(0, cost - cap) / cap) * 120 + // stay in budget
        repeatPenalty +
        scalePenalty;
      if (score < bestScore) {
        bestScore = score;
        best = chosen;
      }
    }

    const chosen = best!;
    for (const meal of chosen) used.set(meal.comboId, (used.get(meal.comboId) ?? 0) + 1);
    days.push({
      day: d,
      meals: chosen,
      kcal: chosen.reduce((s, x) => s + x.kcal, 0),
      protein: chosen.reduce((s, x) => s + x.protein, 0),
      carbs: chosen.reduce((s, x) => s + x.carbs, 0),
      fat: chosen.reduce((s, x) => s + x.fat, 0),
      cost: chosen.reduce((s, x) => s + x.cost, 0),
    });
  }

  const avgCost = Math.round(days.reduce((s, x) => s + x.cost, 0) / days.length);
  const daysOverBudget = days.filter((x) => x.cost > cap).length;
  const notes = [...targets.notes];
  if (daysOverBudget > 0) {
    notes.push(
      `Reaching your food target can cost more than ₹${cap} a day on ${daysOverBudget} day${daysOverBudget > 1 ? "s" : ""}. Cheaper swaps: more dal, chana, soya, eggs and seasonal fruit.`,
    );
  }
  const avgProtein = days.reduce((s, x) => s + x.protein, 0) / days.length;
  if (avgProtein < targets.proteinG * 0.9) {
    notes.push(
      "These meals are a little low in protein for your goal (hard to avoid on a tight budget or with your food choices). An extra katori of dal, some soya chunks, curd or, if you eat them, eggs will help.",
    );
  }
  notes.push("Prices are rough estimates and change by city and season. Portions and values are approximate.");
  notes.push("If you have allergies, a medical condition or are unwell, check with a doctor or dietitian before following any meal plan.");

  return { days, targets, budgetCap: cap, avgCost, daysOverBudget, notes };
}
