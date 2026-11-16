// The plan engine: user profile + exercise library in, weekly plan out.
// It is a PURE function: no network, no AI, no randomness except a seeded one.
// That makes it free to run, instant, and easy to test.
import type { Exercise, Goal, PlanDay, PlanInput, PlannedExercise, WeeklyPlan } from "../types.ts";
import type { Slot } from "./rules.ts";
import {
  DAY_TEMPLATES,
  TEEN_MAX_SETS,
  TEEN_MIN_REPS,
  TEEN_MIN_REST_SEC,
  baseScheme,
  isTeen,
  isTeenSafe,
  maxDaysFor,
  splitFor,
} from "./rules.ts";
import { hashString, mulberry32 } from "./rng.ts";

interface Ctx {
  input: PlanInput;
  teen: boolean;
  week: number;
  pool: Exercise[];
  rand: () => number;
  used: Map<string, number>; // how many times each exercise is already in this week's plan
}

export function generatePlan(input: PlanInput, library: Exercise[]): WeeklyPlan {
  const week = Math.max(1, Math.floor(input.week ?? 1));
  const teen = isTeen(input.age);
  const notes: string[] = [];

  // 1. Clamp training days to a safe range (always leave recovery time).
  const maxDays = maxDaysFor(input.level, input.age);
  const requested = Math.round(input.daysPerWeek);
  const dayCount = Math.min(Math.max(requested, 2), maxDays);
  if (dayCount !== requested) {
    notes.push(`We set your plan to ${dayCount} days a week: that keeps enough rest for your body to recover.`);
  }

  // 2. Build the pool of allowed exercises.
  //    Beginners only get beginner exercises; teens never get the heavy/technical ones.
  const pool = library.filter(
    (e) => (input.level === "intermediate" || e.level === "beginner") && (!teen || isTeenSafe(e)),
  );

  // 3. Seeded randomness: same input => same plan; a new week => fresh variety.
  const rand = mulberry32(hashString(`${week}|${input.goal}|${input.level}|${input.place}|${dayCount}`));
  const ctx: Ctx = { input, teen, week, pool, rand, used: new Map() };

  const days = input.place === "yoga" ? buildYogaDays(ctx, dayCount) : buildStrengthDays(ctx, dayCount);

  // 4. Plain-language notes shown with the plan.
  const phase = (week - 1) % 4;
  notes.push(
    phase === 3
      ? `Week ${week} is an easy "recovery" week: lighter volume so you come back stronger.`
      : `Week ${week}: ${phase === 0 ? "start with the base numbers shown." : "you are doing a little more than last week."}`,
  );
  notes.push("Warm up for 5 minutes first and stretch afterwards. Rest at least one day between hard sessions when you can.");
  notes.push("Muscle burn is normal. Sharp or joint pain is not: stop and ask a coach or doctor.");
  if (teen) {
    notes.push("Under-18 plan: focus on good technique, not heavy weights. Barbell and other heavy lifts are left out until you have a coach.");
    if (input.goal === "fat_loss") {
      notes.push("Healthy habits beat dieting: this plan builds fitness and energy. Please do not cut calories without a doctor or dietitian.");
    }
  }

  return { week, days, notes };
}

// ───────────────────────── Strength days (gym / home) ─────────────────────────

function buildStrengthDays(ctx: Ctx, dayCount: number): PlanDay[] {
  const { goal, level } = ctx.input;
  return splitFor(level, dayCount).map((kind, idx) => {
    const template = DAY_TEMPLATES[kind];
    const slots: Slot[] = [...template.slots];

    // Goal-specific additions.
    if (goal === "fat_loss") slots.push({ pattern: "cardio", role: "cardio" }); // cardio finisher
    if (goal === "flexibility") {
      slots.push({ pattern: "mobility", anyPlace: true }, { pattern: "mobility", anyPlace: true }); // stretch cool-down
    }

    const dayUsed = new Set<string>();
    const picked: Exercise[] = [];
    for (const slot of slots) {
      const e = pickForSlot(ctx, slot, dayUsed);
      if (!e) continue;
      picked.push(e);
      dayUsed.add(e.id);
      ctx.used.set(e.id, (ctx.used.get(e.id) ?? 0) + 1);
    }

    // Big compound lifts first (when you are fresh), isolation next, core, then cardio, then stretching.
    picked.sort((a, b) => orderRank(a) - orderRank(b));

    return { day: idx + 1, title: template.title, exercises: picked.map((e) => toPlanned(ctx, e)) };
  });
}

function orderRank(e: Exercise): number {
  if (e.pattern === "breathing" || e.pattern === "mobility") return 4;
  if (e.pattern === "cardio") return 3;
  if (e.pattern === "core") return 2;
  return e.role === "compound" ? 0 : 1;
}

// Choose the best exercise for one slot.
function pickForSlot(ctx: Ctx, slot: Slot, dayUsed: Set<string>): Exercise | undefined {
  const { place } = ctx.input;
  const base = ctx.pool.filter(
    (e) =>
      !dayUsed.has(e.id) &&
      e.pattern === slot.pattern &&
      (slot.anyPlace ? true : e.places.includes(place)),
  );
  // Prefer the requested role, but fall back if the pool has none (small home pools).
  let candidates = slot.role ? base.filter((e) => e.role === slot.role) : base;
  if (candidates.length === 0) candidates = base;
  return best(ctx, candidates);
}

// Score candidates and return the winner.
// + goal match, + level match (intermediate prefers intermediate), - already used this week, + small seeded jitter.
function best(ctx: Ctx, candidates: Exercise[]): Exercise | undefined {
  const { goal, level } = ctx.input;
  let winner: Exercise | undefined;
  let winnerScore = -Infinity;
  for (const e of candidates) {
    const score =
      (e.goals.includes(goal) ? 3 : 0) +
      (level === "intermediate" && e.level === "intermediate" ? 2 : 0) -
      4 * (ctx.used.get(e.id) ?? 0) +
      ctx.rand();
    if (score > winnerScore) {
      winnerScore = score;
      winner = e;
    }
  }
  return winner;
}

// ───────────────────────── Yoga days ─────────────────────────

const YOGA_TITLES: Record<Goal, string> = {
  flexibility: "Deep Stretch",
  stay_fit: "Balance & Breath",
  fat_loss: "Flow & Energise",
  muscle_gain: "Yoga Strength",
};

function buildYogaDays(ctx: Ctx, dayCount: number): PlanDay[] {
  const { goal, level } = ctx.input;
  const poseCount = level === "beginner" ? 6 : 7;
  const yogaPool = ctx.pool.filter((e) => e.places.includes("yoga"));
  const breathing = yogaPool.filter((e) => e.pattern === "breathing");
  const savasana = breathing.find((e) => e.id === "savasana");
  const openers = breathing.filter((e) => e.id !== "savasana");

  return Array.from({ length: dayCount }, (_, idx) => {
    const dayUsed = new Set<string>();
    const sequence: Exercise[] = [];

    // Opening breath, then poses, then final rest.
    const opener = best(ctx, openers);
    if (opener) {
      sequence.push(opener);
      dayUsed.add(opener.id);
    }

    const poses: Exercise[] = [];
    for (let n = 0; n < poseCount; n++) {
      const candidates = yogaPool.filter((e) => e.pattern === "mobility" && !dayUsed.has(e.id));
      const pose = best(ctx, candidates);
      if (!pose) break;
      poses.push(pose);
      dayUsed.add(pose.id);
      ctx.used.set(pose.id, (ctx.used.get(pose.id) ?? 0) + 1);
    }
    // Gentle spine / full-body warm-up poses first, deeper stretches after.
    poses.sort((a, b) => warmupRank(a) - warmupRank(b));
    sequence.push(...poses);
    if (savasana) sequence.push(savasana);

    return {
      day: idx + 1,
      title: `${YOGA_TITLES[goal]} ${idx + 1}`,
      exercises: sequence.map((e) => toPlanned(ctx, e)),
    };
  });
}

function warmupRank(e: Exercise): number {
  return e.muscles.includes("spine") || e.muscles.includes("full body") ? 0 : 1;
}

// ───────────────────────── Sets, reps, progression ─────────────────────────

// Convert a chosen exercise into sets/reps/rest with weekly progression and teen limits.
function toPlanned(ctx: Ctx, e: Exercise): PlannedExercise {
  const { goal, level } = ctx.input;
  const phase = (ctx.week - 1) % 4; // 0,1,2 = build weeks; 3 = easy "deload" week
  const deload = phase === 3;
  const bump = deload ? 0 : phase; // extra reps (or +5s per step) on top of the base

  // Timed work: holds, cardio intervals, yoga poses, breathing.
  if (e.pattern === "breathing") {
    return { exerciseId: e.id, sets: 1, reps: e.id === "savasana" ? 180 : 120, unit: "seconds", restSec: 0 };
  }
  if (e.pattern === "mobility") {
    const base = level === "beginner" ? 30 : 45;
    return { exerciseId: e.id, sets: 1, reps: base + 5 * bump, unit: "seconds", restSec: 0 };
  }
  if (e.pattern === "cardio" || e.timed) {
    const isCardio = e.pattern === "cardio";
    const base = isCardio ? (level === "beginner" ? 30 : 40) : level === "beginner" ? 20 : 30;
    return {
      exerciseId: e.id,
      sets: deload ? 2 : 3,
      reps: base + 5 * bump,
      unit: "seconds",
      restSec: 30,
    };
  }

  // Rep-based strength work. Teens (and fat-loss for teens) use gentler "stay fit" numbers.
  const paramGoal: Goal = ctx.teen && goal === "fat_loss" ? "stay_fit" : goal;
  const scheme = baseScheme(paramGoal, level, e.role);
  let sets = deload ? Math.max(2, scheme.sets - 1) : scheme.sets;
  let reps = scheme.reps + bump;
  let restSec = scheme.restSec;

  if (ctx.teen) {
    sets = Math.min(sets, TEEN_MAX_SETS);
    reps = Math.max(reps, TEEN_MIN_REPS);
    restSec = Math.max(restSec, TEEN_MIN_REST_SEC);
  }
  return { exerciseId: e.id, sets, reps, unit: "reps", restSec };
}
