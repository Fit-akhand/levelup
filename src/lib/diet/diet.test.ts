import { test } from "node:test";
import assert from "node:assert/strict";
import { bmi, bmr, computeTargets } from "./nutrition.ts";
import { BUDGET_CAP, generateDiet } from "./generateDiet.ts";
import { foods } from "../../data/foods.ts";
import { meals } from "../../data/meals.ts";
import type { Allergen, Budget, DietPref, Goal } from "../types.ts";

const goals: Goal[] = ["fat_loss", "muscle_gain", "stay_fit", "flexibility"];
const diets: DietPref[] = ["veg", "egg", "nonveg"];
const budgets: Budget[] = ["low", "medium", "high"];
const avoidSets: Allergen[][] = [
  [], ["peanuts"], ["dairy"], ["gluten"],
  ["peanuts", "dairy"], ["peanuts", "gluten"], ["dairy", "gluten"], ["peanuts", "dairy", "gluten"],
];
const foodById = new Map(foods.map((f) => [f.id, f]));
const mealById = new Map(meals.map((m) => [m.id, m]));

const person = (over: Partial<Parameters<typeof computeTargets>[0]> = {}) => ({
  age: 25, sex: "male" as const, heightCm: 175, weightKg: 70, goal: "stay_fit" as Goal, daysPerWeek: 3, ...over,
});

// ───────────── Data quality ─────────────

test("every meal uses foods that exist", () => {
  for (const m of meals) for (const it of m.items) assert.ok(foodById.has(it.foodId), `${m.id}: unknown food ${it.foodId}`);
});

test("food data is internally consistent: calories ~ 4*protein + 4*carbs + 9*fat", () => {
  for (const f of foods) {
    const calc = 4 * f.protein + 4 * f.carbs + 9 * f.fat;
    assert.ok(Math.abs(calc - f.kcal) / f.kcal < 0.25, `${f.id}: listed ${f.kcal} kcal but macros give ${calc.toFixed(0)}`);
  }
});

test("ids are unique", () => {
  assert.equal(new Set(foods.map((f) => f.id)).size, foods.length);
  assert.equal(new Set(meals.map((m) => m.id)).size, meals.length);
});

// ───────────── Safety rules in nutrition.ts ─────────────

test("Mifflin-St Jeor matches a worked example", () => {
  // male, 30 y, 175 cm, 70 kg: 10*70 + 6.25*175 - 5*30 + 5 = 1648.75
  assert.equal(bmr({ age: 30, sex: "male", heightCm: 175, weightKg: 70 }), 1648.75);
});

test("RULE 1: under-18s never get a deficit, and never see calorie numbers", () => {
  for (const goal of goals)
    for (const sex of ["male", "female", "other"] as const)
      for (const age of [15, 16, 17]) {
        const t = computeTargets(person({ age, sex, goal, weightKg: 45, heightCm: 160 }));
        const stay = computeTargets(person({ age, sex, goal: "stay_fit", weightKg: 45, heightCm: 160 }));
        assert.equal(t.showNumbers, false);
        assert.ok(t.kcal >= stay.kcal, `${goal}/${sex}/${age}: teen fat-loss plan must not be lower than maintenance`);
        assert.ok(t.kcal >= (sex === "female" ? 1800 : sex === "other" ? 1900 : 2000), "teen floor");
      }
});

test("RULE 2: adult fat loss is a gentle deficit and never below the floor", () => {
  for (const sex of ["male", "female", "other"] as const) {
    const loss = computeTargets(person({ sex, goal: "fat_loss", weightKg: 80 }));
    const stay = computeTargets(person({ sex, goal: "stay_fit", weightKg: 80 }));
    assert.ok(loss.kcal < stay.kcal, "deficit exists");
    assert.ok(loss.kcal >= stay.kcal * 0.84, "deficit is at most ~15%");
    assert.ok(loss.kcal >= { male: 1500, female: 1200, other: 1350 }[sex]);
  }
  // A small woman: the floor kicks in.
  const small = computeTargets(person({ sex: "female", heightCm: 150, weightKg: 52, age: 40, goal: "fat_loss", daysPerWeek: 2 }));
  assert.ok(small.kcal >= 1200);
});

test("RULE 3: an underweight adult never gets a deficit", () => {
  assert.ok(bmi(175, 50) < 18.5);
  const loss = computeTargets(person({ goal: "fat_loss", weightKg: 50 }));
  const stay = computeTargets(person({ goal: "stay_fit", weightKg: 50 }));
  assert.equal(loss.kcal, stay.kcal);
  assert.ok(loss.notes.some((n) => n.includes("doctor")));
});

test("protein never exceeds 35% of calories; macros add up", () => {
  for (const goal of goals)
    for (const age of [16, 25]) {
      const t = computeTargets(person({ goal, age, weightKg: 100 }));
      assert.ok(t.proteinG * 4 <= t.kcal * 0.35 + 4);
      const sum = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
      assert.ok(Math.abs(sum - t.kcal) < 60, `macros ${sum} vs ${t.kcal}`);
    }
});

// ───────────── The meal planner ─────────────

function* matrix() {
  for (const diet of diets)
    for (const avoid of avoidSets)
      for (const budget of budgets)
        for (const age of [16, 25]) yield { diet, avoid, budget, age };
}

test("every diet x allergy x budget combination produces a valid 7-day plan", () => {
  for (const { diet, avoid, budget, age } of matrix()) {
    const targets = computeTargets(person({ age, goal: "stay_fit" }));
    const plan = generateDiet({ targets, diet, budget, avoid }, foods, meals);
    assert.equal(plan.days.length, 7);
    for (const day of plan.days) {
      assert.ok(day.meals.length >= 4);
      const slots = day.meals.map((m) => m.slot);
      for (const s of ["breakfast", "lunch", "dinner"]) assert.ok(slots.includes(s as never), `${s} missing`);
    }
  }
});

test("HARD RULE: meals never break the diet type or an allergy", () => {
  const rank = { veg: 0, egg: 1, nonveg: 2 };
  for (const { diet, avoid, budget, age } of matrix()) {
    const targets = computeTargets(person({ age, goal: "muscle_gain" }));
    const plan = generateDiet({ targets, diet, budget, avoid }, foods, meals);
    for (const day of plan.days)
      for (const meal of day.meals)
        for (const item of meal.items) {
          const food = foodById.get(item.foodId)!;
          assert.ok(rank[food.diet] <= rank[diet], `${diet} user got ${food.id}`);
          for (const a of avoid) assert.ok(!food.allergens.includes(a), `${a}-free user got ${food.id}`);
        }
  }
});

test("daily calories land close to the target and protein is adequate", () => {
  for (const { diet, avoid, budget, age } of matrix()) {
    for (const goal of ["fat_loss", "muscle_gain"] as Goal[]) {
      const targets = computeTargets(person({ age, goal, weightKg: 65 }));
      const plan = generateDiet({ targets, diet, budget, avoid }, foods, meals);
      for (const day of plan.days) {
        const off = Math.abs(day.kcal - targets.kcal) / targets.kcal;
        assert.ok(off <= 0.12, `${diet}/${avoid}/${budget}/${goal}: day ${day.day} is ${(off * 100).toFixed(0)}% off target`);
      }
      const avgProtein = plan.days.reduce((s, d) => s + d.protein, 0) / 7;
      assert.ok(avgProtein >= targets.proteinG * 0.75, `${diet}/${avoid}/${goal}: protein ${avgProtein.toFixed(0)} vs ${targets.proteinG}`);
      // When protein falls clearly short, the plan must say so instead of hiding it.
      if (avgProtein < targets.proteinG * 0.9) assert.ok(plan.notes.some((n) => n.includes("low in protein")), "missing protein note");
    }
  }
});

test("portions respect each food's step and meal nutrition adds up", () => {
  const targets = computeTargets(person());
  const plan = generateDiet({ targets, diet: "nonveg", budget: "medium", avoid: [] }, foods, meals);
  for (const day of plan.days)
    for (const meal of day.meals) {
      let kcal = 0;
      for (const item of meal.items) {
        const food = foodById.get(item.foodId)!;
        assert.ok(item.qty >= food.step && Math.abs(item.qty / food.step - Math.round(item.qty / food.step)) < 1e-9, `${food.id} qty ${item.qty}`);
        kcal += food.kcal * item.qty;
      }
      assert.ok(Math.abs(kcal - meal.kcal) <= 1, "meal kcal matches foods");
    }
});

test("variety: no meal appears more than 3 times in a week", () => {
  for (const diet of diets) {
    const plan = generateDiet({ targets: computeTargets(person()), diet, budget: "medium", avoid: [] }, foods, meals);
    const count = new Map<string, number>();
    for (const d of plan.days) for (const m of d.meals) count.set(m.comboId, (count.get(m.comboId) ?? 0) + 1);
    for (const [id, n] of count) assert.ok(n <= 3, `${id} repeats ${n} times`);
  }
});

test("deterministic: same input gives the same plan; a new variant gives a different one", () => {
  const input = { targets: computeTargets(person()), diet: "egg" as const, budget: "medium" as const, avoid: [] as Allergen[] };
  assert.deepEqual(generateDiet(input, foods, meals), generateDiet(input, foods, meals));
  const a = generateDiet(input, foods, meals).days.flatMap((d) => d.meals.map((m) => m.comboId));
  const b = generateDiet({ ...input, variant: 1 }, foods, meals).days.flatMap((d) => d.meals.map((m) => m.comboId));
  assert.notDeepEqual(a, b);
});

test("budget: typical targets stay within the daily cap on average", () => {
  for (const budget of budgets) {
    const targets = computeTargets(person({ goal: "stay_fit", weightKg: 65 }));
    const plan = generateDiet({ targets, diet: "veg", budget, avoid: [] }, foods, meals);
    assert.ok(plan.avgCost <= BUDGET_CAP[budget], `${budget}: average ₹${plan.avgCost} over cap ₹${BUDGET_CAP[budget]}`);
  }
});

test("the plan explains when the budget cannot be met", () => {
  const targets = computeTargets(person({ goal: "muscle_gain", weightKg: 90, heightCm: 185, daysPerWeek: 6 }));
  const plan = generateDiet({ targets, diet: "nonveg", budget: "low", avoid: [] }, foods, meals);
  if (plan.daysOverBudget > 0) assert.ok(plan.notes.some((n) => n.includes("cost more")));
});

test("meal pool is deep enough for every diet and allergy combination (at least 3 per slot)", () => {
  const rank = { veg: 0, egg: 1, nonveg: 2 };
  for (const diet of diets)
    for (const avoid of avoidSets)
      for (const slot of ["breakfast", "lunch", "snack", "dinner"]) {
        const n = meals.filter((m) => {
          if (m.slot !== slot) return false;
          const fs = m.items.map((i) => foodById.get(i.foodId)!);
          return fs.every((f) => rank[f.diet] <= rank[diet] && !avoid.some((a) => f.allergens.includes(a)));
        }).length;
        assert.ok(n >= 3, `${diet} avoiding [${avoid}]: only ${n} ${slot} meals`);
      }
  assert.ok(mealById.size === meals.length);
});
