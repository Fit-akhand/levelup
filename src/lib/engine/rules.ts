// The "rulebook" for plan generation: pure data and small helpers, no logic about
// choosing exercises. Keeping rules separate means a trainer can review/tune them
// without touching the planner code.
import type { Exercise, Goal, Level, Pattern, Role } from "../types.ts";

// A slot is "one exercise needed here": a movement pattern (and optionally a role).
export interface Slot {
  pattern: Pattern;
  role?: Role;
  anyPlace?: boolean; // may be drawn from any place (used for yoga cool-downs)
}

export type DayKind = "fullBodyA" | "fullBodyB" | "upper" | "lower" | "push" | "pull" | "legs";

const c = (pattern: Pattern): Slot => ({ pattern, role: "compound" });
const i = (pattern: Pattern): Slot => ({ pattern, role: "isolation" });

// What each type of training day contains. Order here is a starting point;
// the planner re-orders by role (compound lifts first).
export const DAY_TEMPLATES: Record<DayKind, { title: string; slots: Slot[] }> = {
  fullBodyA: { title: "Full Body A", slots: [c("squat"), c("push"), c("pull"), c("hinge"), i("core")] },
  fullBodyB: { title: "Full Body B", slots: [c("lunge"), c("push"), c("pull"), c("hinge"), i("core")] },
  upper: { title: "Upper Body", slots: [c("push"), c("pull"), i("push"), i("pull"), i("core")] },
  lower: { title: "Lower Body", slots: [c("squat"), c("hinge"), c("lunge"), i("hinge"), i("core")] },
  push: { title: "Push Day", slots: [c("push"), c("push"), i("push"), i("push"), i("core")] },
  pull: { title: "Pull Day", slots: [c("pull"), c("pull"), i("pull"), i("pull"), i("core")] },
  legs: { title: "Leg Day", slots: [c("squat"), c("hinge"), c("lunge"), i("squat"), i("core")] },
};

// Which days to train, by level and days/week.
// Beginners repeat full-body (practice skills often); intermediates split by muscle group.
export function splitFor(level: Level, days: number): DayKind[] {
  if (level === "beginner") {
    switch (days) {
      case 2: return ["fullBodyA", "fullBodyB"];
      case 3: return ["fullBodyA", "fullBodyB", "fullBodyA"];
      case 4: return ["upper", "lower", "upper", "lower"];
      default: return ["upper", "lower", "fullBodyA", "upper", "lower"];
    }
  }
  switch (days) {
    case 2: return ["upper", "lower"];
    case 3: return ["fullBodyA", "fullBodyB", "fullBodyA"];
    case 4: return ["upper", "lower", "upper", "lower"];
    case 5: return ["push", "pull", "legs", "upper", "lower"];
    default: return ["push", "pull", "legs", "push", "pull", "legs"];
  }
}

export interface SetScheme {
  sets: number;
  reps: number;
  restSec: number;
}

// Sets / reps / rest by goal. (Flexibility users still strength-train lightly, "stay fit" style.)
export function baseScheme(goal: Goal, level: Level, role: Role): SetScheme {
  const compound = role === "compound";
  switch (goal) {
    case "muscle_gain":
      if (compound) {
        return level === "beginner"
          ? { sets: 3, reps: 10, restSec: 75 }
          : { sets: 4, reps: 8, restSec: 90 };
      }
      return { sets: 3, reps: 12, restSec: 60 };
    case "fat_loss":
      return compound ? { sets: 3, reps: 12, restSec: 45 } : { sets: 3, reps: 15, restSec: 30 };
    default: // stay_fit, flexibility
      return compound ? { sets: 3, reps: 10, restSec: 60 } : { sets: 2, reps: 12, restSec: 45 };
  }
}

// ───────────────────────── Under-18 rules ─────────────────────────
export const TEEN_MAX_DAYS = 5;
export const TEEN_MAX_SETS = 3;
export const TEEN_MIN_REPS = 10;
export const TEEN_MIN_REST_SEC = 45;

// Heavy / technical lifts left out for teens unless supervised by a coach.
const TEEN_EXCLUDED_IDS = new Set(["kettlebell-swing", "wall-handstand-hold", "hack-squat"]);

export function isTeen(age: number): boolean {
  return age < 18;
}

// The most training days we allow, so there is always recovery time.
// Shared by the engine (to clamp) and the onboarding form (to disable options).
export function maxDaysFor(level: Level, age: number): number {
  if (isTeen(age)) return TEEN_MAX_DAYS;
  return level === "beginner" ? 5 : 6;
}

export function isTeenSafe(e: Exercise): boolean {
  if (TEEN_EXCLUDED_IDS.has(e.id)) return false;
  return !e.equipment.some((q) => q.includes("barbell") || q.includes("EZ bar"));
}
