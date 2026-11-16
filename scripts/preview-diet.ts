// Print a sample diet plan. Usage:
//   npm run diet -- <age> <sex> <heightCm> <weightKg> <goal> <days> <diet> <budget> [avoid,comma,separated]
// Example: npm run diet -- 22 male 175 68 muscle_gain 4 veg low
import { generateDiet } from "../src/lib/diet/generateDiet.ts";
import { computeTargets } from "../src/lib/diet/nutrition.ts";
import { foods } from "../src/data/foods.ts";
import { meals } from "../src/data/meals.ts";
import type { Allergen, Budget, DietPref, Goal } from "../src/lib/types.ts";

const [age = "22", sex = "male", h = "175", w = "68", goal = "muscle_gain", days = "4", diet = "veg", budget = "low", avoid = ""] =
  process.argv.slice(2);

const targets = computeTargets({
  age: Number(age), sex: sex as "male" | "female" | "other", heightCm: Number(h), weightKg: Number(w),
  goal: goal as Goal, daysPerWeek: Number(days),
});
const plan = generateDiet(
  { targets, diet: diet as DietPref, budget: budget as Budget, avoid: avoid ? (avoid.split(",") as Allergen[]) : [] },
  foods, meals,
);

console.log(`\nTargets: ${targets.kcal} kcal · protein ${targets.proteinG} g · carbs ${targets.carbsG} g · fat ${targets.fatG} g`);
console.log(`Budget cap ₹${plan.budgetCap}/day · average ₹${plan.avgCost} · days over cap: ${plan.daysOverBudget}\n`);
for (const day of plan.days.slice(0, 3)) {
  console.log(`Day ${day.day}: ${day.kcal} kcal, P ${day.protein} g, ₹${day.cost}`);
  for (const m of day.meals) console.log(`  ${m.slot.padEnd(9)} ${m.name}  (${m.kcal} kcal, P ${m.protein}, ₹${m.cost})  → ${m.items.map((i) => i.label.replace(/ \(.*\)/, "")).join("; ")}`);
}
console.log("\nNotes:");
for (const n of plan.notes) console.log(`  * ${n}`);
