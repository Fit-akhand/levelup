// Print a sample plan in the terminal so you can see what the engine produces.
// Usage: npm run plan -- <goal> <level> <place> <days> <age> [week]
//   goal:  fat_loss | muscle_gain | stay_fit | flexibility
//   level: beginner | intermediate        place: gym | home | yoga
// Example: npm run plan -- muscle_gain beginner gym 3 22
import { generatePlan } from "../src/lib/engine/generatePlan.ts";
import { library } from "../src/data/library.ts";
import type { Goal, Level, Place } from "../src/lib/types.ts";

const [goal = "muscle_gain", level = "beginner", place = "gym", days = "3", age = "22", week = "1"] =
  process.argv.slice(2);

const plan = generatePlan(
  { goal: goal as Goal, level: level as Level, place: place as Place, daysPerWeek: Number(days), age: Number(age), week: Number(week) },
  library,
);
const byId = new Map(library.map((e) => [e.id, e]));

console.log(`\nLEVEL UP plan: ${goal} · ${level} · ${place} · ${days} days · age ${age} · week ${plan.week}\n`);
for (const day of plan.days) {
  console.log(`Day ${day.day}: ${day.title}`);
  for (const x of day.exercises) {
    const e = byId.get(x.exerciseId)!;
    const amount = x.unit === "seconds" ? `${x.sets} x ${x.reps}s` : `${x.sets} x ${x.reps}`;
    console.log(`  - ${e.name.padEnd(36)} ${amount.padEnd(9)} rest ${x.restSec}s   [${e.pattern}/${e.role}]`);
  }
  console.log("");
}
console.log("Notes:");
for (const n of plan.notes) console.log(`  * ${n}`);
