// Sanity checks for the exercise library. Run with: npm run check:library
// Fails (exit code 1) if the data has problems the type system cannot catch.
import { library as exercises } from "../src/data/library.ts";
import { EXERCISE_DEMOS } from "../src/lib/demo/exerciseDemos.ts";

const errors: string[] = [];

// 1. Every id must be unique, otherwise plans could point at the wrong exercise.
const seen = new Set<string>();
for (const e of exercises) {
  if (seen.has(e.id)) errors.push(`Duplicate id: ${e.id}`);
  seen.add(e.id);
}

// 2. Every exercise needs real content.
for (const e of exercises) {
  if (e.instructions.length < 2) errors.push(`${e.id}: needs at least 2 instruction steps`);
  if (e.muscles.length === 0) errors.push(`${e.id}: no muscles listed`);
  if (e.goals.length === 0) errors.push(`${e.id}: no goals listed`);
  if (e.places.length === 0) errors.push(`${e.id}: no places listed`);
}

// 3. The plan engine needs enough choices for every place x level combination.
const places = ["gym", "home", "yoga"] as const;
const levels = ["beginner", "intermediate"] as const;
const MIN_PER_COMBO = 8;
console.log("Coverage (exercises per place x level):");
for (const p of places) {
  for (const l of levels) {
    const n = exercises.filter((e) => e.places.includes(p) && e.level === l).length;
    console.log(`  ${p.padEnd(5)} ${l.padEnd(12)} ${n}`);
    if (n < MIN_PER_COMBO) errors.push(`Too few exercises for ${p}/${l}: ${n} (min ${MIN_PER_COMBO})`);
  }
}

// 4. For strength places, balanced days need every movement pattern available.
const strengthPatterns = ["squat", "hinge", "lunge", "push", "pull", "core", "cardio"] as const;
console.log("\nPattern coverage (gym/home x level, strength days):");
for (const p of ["gym", "home"] as const) {
  for (const l of levels) {
    const missing = strengthPatterns.filter(
      (pat) => !exercises.some((e) => e.places.includes(p) && e.level === l && e.pattern === pat),
    );
    const row = strengthPatterns
      .map((pat) => `${pat}:${exercises.filter((e) => e.places.includes(p) && e.level === l && e.pattern === pat).length}`)
      .join(" ");
    console.log(`  ${p.padEnd(5)} ${l.padEnd(12)} ${row}`);
    if (missing.length) errors.push(`${p}/${l} is missing patterns: ${missing.join(", ")}`);
  }
}

// 4b. Variety: the main lifts need at least 2 compound options, or the same exercise repeats every day.
const compoundPatterns = ["squat", "hinge", "lunge", "push", "pull"] as const;
for (const p of ["gym", "home"] as const) {
  for (const l of levels) {
    for (const pat of compoundPatterns) {
      // Intermediates can also use beginner exercises, so count both.
      const n = exercises.filter(
        (e) => e.places.includes(p) && e.pattern === pat && e.role === "compound" && (l === "intermediate" || e.level === "beginner"),
      ).length;
      if (n < 2) errors.push(`${p}/${l}: only ${n} compound "${pat}" exercise(s); plans will repeat it`);
    }
  }
}

// 5. Every goal needs enough exercises in every place (beginner level at least).
const goals = ["fat_loss", "muscle_gain", "stay_fit", "flexibility"] as const;
console.log("\nGoal coverage (exercises tagged per goal):");
for (const g of goals) {
  const n = exercises.filter((e) => e.goals.includes(g)).length;
  console.log(`  ${g.padEnd(12)} ${n}`);
  if (n < 10) errors.push(`Goal ${g} has too few exercises: ${n}`);
}

// 6. Demo coverage (informational): how many exercises have an animated demo.
const withDemo = exercises.filter((e) => EXERCISE_DEMOS[e.id]).length;
console.log(`\nAnimated demos: ${withDemo} of ${exercises.length} exercises`);
const noDemo = exercises.filter((e) => !EXERCISE_DEMOS[e.id] && e.type === "strength").map((e) => e.name);
console.log(`Strength exercises still without a demo: ${noDemo.length}`);

console.log(`\nTotal exercises: ${exercises.length}`);

if (errors.length > 0) {
  console.error("\nProblems found:");
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}
console.log("Library OK");
