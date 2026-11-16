// Tests for the plan engine. Run with: npm test
// Uses Node's built-in test runner, so there is nothing extra to install.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePlan } from "./generatePlan.ts";
import { library } from "../../data/library.ts";
import type { Goal, Level, Place, PlanInput } from "../types.ts";

const byId = new Map(library.map((e) => [e.id, e]));
const goals: Goal[] = ["fat_loss", "muscle_gain", "stay_fit", "flexibility"];
const levels: Level[] = ["beginner", "intermediate"];
const places: Place[] = ["gym", "home", "yoga"];

// Every combination the app can produce (adult and teen).
function* allInputs(): Generator<PlanInput> {
  for (const goal of goals)
    for (const level of levels)
      for (const place of places)
        for (const daysPerWeek of [2, 3, 4, 5, 6])
          for (const age of [16, 25])
            yield { goal, level, place, daysPerWeek, age, week: 1 };
}

const label = (i: PlanInput) => `${i.goal}/${i.level}/${i.place}/${i.daysPerWeek}d/age${i.age}`;

test("every combination produces a valid plan", () => {
  for (const input of allInputs()) {
    const plan = generatePlan(input, library);
    const teen = input.age < 18;
    const maxDays = teen ? 5 : input.level === "beginner" ? 5 : 6;
    assert.equal(plan.days.length, Math.min(input.daysPerWeek, maxDays), `day count for ${label(input)}`);
    for (const day of plan.days) {
      assert.ok(day.exercises.length >= 4, `${label(input)} day ${day.day} has too few exercises`);
      const ids = day.exercises.map((x) => x.exerciseId);
      assert.equal(new Set(ids).size, ids.length, `${label(input)} day ${day.day} repeats an exercise`);
      for (const x of day.exercises) {
        assert.ok(byId.has(x.exerciseId), `unknown exercise ${x.exerciseId}`);
        assert.ok(x.sets >= 1 && x.reps >= 1, `bad numbers for ${x.exerciseId}`);
      }
    }
  }
});

test("exercises respect the chosen place (except stretch cool-downs)", () => {
  for (const input of allInputs()) {
    const plan = generatePlan(input, library);
    for (const day of plan.days)
      for (const x of day.exercises) {
        const e = byId.get(x.exerciseId)!;
        const isCooldown = input.goal === "flexibility" && e.pattern === "mobility";
        assert.ok(e.places.includes(input.place) || isCooldown, `${label(input)}: ${e.id} not for ${input.place}`);
      }
  }
});

test("beginners never get intermediate exercises", () => {
  for (const input of allInputs()) {
    if (input.level !== "beginner") continue;
    const plan = generatePlan(input, library);
    for (const day of plan.days)
      for (const x of day.exercises)
        assert.equal(byId.get(x.exerciseId)!.level, "beginner", `${label(input)}: ${x.exerciseId}`);
  }
});

test("under-18 rules: no barbells, capped sets, min reps, max 5 days", () => {
  for (const input of allInputs()) {
    if (input.age >= 18) continue;
    const plan = generatePlan({ ...input, daysPerWeek: 6 }, library);
    assert.ok(plan.days.length <= 5, "teen plan must have at most 5 days");
    for (const day of plan.days)
      for (const x of day.exercises) {
        const e = byId.get(x.exerciseId)!;
        assert.ok(!e.equipment.some((q) => q.includes("barbell") || q.includes("EZ bar")), `${label(input)}: ${e.id} is a barbell lift`);
        assert.ok(x.sets <= 3, `${label(input)}: ${e.id} has ${x.sets} sets`);
        if (x.unit === "reps") assert.ok(x.reps >= 10, `${label(input)}: ${e.id} has ${x.reps} reps`);
      }
  }
});

test("teen fat-loss plan carries the healthy-habits note", () => {
  const plan = generatePlan({ goal: "fat_loss", level: "beginner", place: "home", daysPerWeek: 3, age: 16 }, library);
  assert.ok(plan.notes.some((n) => n.includes("dieting")));
});

test("full-body days are balanced (squat/lunge, push, pull, hinge) for gym and home", () => {
  for (const place of ["gym", "home"] as Place[])
    for (const level of levels) {
      const plan = generatePlan({ goal: "stay_fit", level, place, daysPerWeek: 3, age: 25 }, library);
      for (const day of plan.days) {
        const patterns = new Set(day.exercises.map((x) => byId.get(x.exerciseId)!.pattern));
        assert.ok(patterns.has("push"), `${place}/${level} day ${day.day} lacks push`);
        assert.ok(patterns.has("pull"), `${place}/${level} day ${day.day} lacks pull`);
        assert.ok(patterns.has("hinge"), `${place}/${level} day ${day.day} lacks hinge`);
        assert.ok(patterns.has("squat") || patterns.has("lunge"), `${place}/${level} day ${day.day} lacks legs`);
      }
    }
});

test("compound lifts come before isolation, cardio and stretching", () => {
  const plan = generatePlan({ goal: "muscle_gain", level: "intermediate", place: "gym", daysPerWeek: 4, age: 25 }, library);
  for (const day of plan.days) {
    const roles = day.exercises.map((x) => byId.get(x.exerciseId)!.role);
    assert.equal(roles[0], "compound", `day ${day.day} should open with a compound lift`);
  }
});

test("fat loss adds a cardio finisher; muscle gain does not", () => {
  const fat = generatePlan({ goal: "fat_loss", level: "beginner", place: "gym", daysPerWeek: 3, age: 25 }, library);
  for (const day of fat.days) {
    const last = byId.get(day.exercises[day.exercises.length - 1].exerciseId)!;
    assert.equal(last.pattern, "cardio", `fat-loss day ${day.day} should end with cardio`);
  }
  const gain = generatePlan({ goal: "muscle_gain", level: "beginner", place: "gym", daysPerWeek: 3, age: 25 }, library);
  for (const day of gain.days)
    assert.ok(!day.exercises.some((x) => byId.get(x.exerciseId)!.pattern === "cardio"));
});

test("goal changes volume: muscle gain uses more sets than stay fit for intermediates", () => {
  const mg = generatePlan({ goal: "muscle_gain", level: "intermediate", place: "gym", daysPerWeek: 3, age: 25 }, library);
  const sf = generatePlan({ goal: "stay_fit", level: "intermediate", place: "gym", daysPerWeek: 3, age: 25 }, library);
  const sets = (p: typeof mg) => p.days.flatMap((d) => d.exercises).filter((x) => x.unit === "reps").reduce((s, x) => s + x.sets, 0);
  assert.ok(sets(mg) > sets(sf));
});

test("flexibility goal on gym/home adds stretching", () => {
  const plan = generatePlan({ goal: "flexibility", level: "beginner", place: "home", daysPerWeek: 3, age: 25 }, library);
  for (const day of plan.days)
    assert.ok(day.exercises.some((x) => byId.get(x.exerciseId)!.pattern === "mobility"), `day ${day.day} has no stretch`);
});

test("yoga sessions open with breathing and end with savasana", () => {
  for (const goal of goals) {
    const plan = generatePlan({ goal, level: "beginner", place: "yoga", daysPerWeek: 4, age: 25 }, library);
    for (const day of plan.days) {
      const first = byId.get(day.exercises[0].exerciseId)!;
      const last = byId.get(day.exercises[day.exercises.length - 1].exerciseId)!;
      assert.equal(first.pattern, "breathing");
      assert.notEqual(first.id, "savasana");
      assert.equal(last.id, "savasana");
    }
  }
});

test("same input gives the same plan (deterministic)", () => {
  const input: PlanInput = { goal: "muscle_gain", level: "intermediate", place: "gym", daysPerWeek: 4, age: 22, week: 2 };
  assert.deepEqual(generatePlan(input, library), generatePlan(input, library));
});

test("different weeks rotate exercises", () => {
  const input: PlanInput = { goal: "stay_fit", level: "intermediate", place: "gym", daysPerWeek: 4, age: 22 };
  const ids = (week: number) => generatePlan({ ...input, week }, library).days.flatMap((d) => d.exercises.map((x) => x.exerciseId));
  assert.notDeepEqual(ids(1), ids(2));
});

test("progression: reps rise over weeks 1-3, week 4 is an easy week", () => {
  const input: PlanInput = { goal: "stay_fit", level: "beginner", place: "gym", daysPerWeek: 3, age: 22 };
  const firstCompound = (week: number) => {
    const plan = generatePlan({ ...input, week }, library);
    return plan.days[0].exercises.find((x) => byId.get(x.exerciseId)!.role === "compound" && x.unit === "reps")!;
  };
  const w1 = firstCompound(1), w3 = firstCompound(3), w4 = firstCompound(4), w5 = firstCompound(5);
  assert.ok(w3.reps > w1.reps, "week 3 should have more reps than week 1");
  assert.ok(w4.sets < w3.sets, "week 4 should drop a set");
  assert.equal(w5.sets, w1.sets, "week 5 restarts the cycle");
});

test("asking for 7 days is clamped with an explanation", () => {
  const plan = generatePlan({ goal: "stay_fit", level: "beginner", place: "gym", daysPerWeek: 7, age: 25 }, library);
  assert.equal(plan.days.length, 5);
  assert.ok(plan.notes.some((n) => n.includes("5 days")));
});
