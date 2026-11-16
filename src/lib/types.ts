// Shared types for Level Up. Every part of the app imports its "shape of data" from here,
// so the compiler warns us if we ever use the wrong field or a misspelled value.

export type Goal = "fat_loss" | "muscle_gain" | "stay_fit" | "flexibility";
export type Level = "beginner" | "intermediate";
export type Place = "gym" | "home" | "yoga";
export type ExerciseType = "strength" | "cardio" | "yoga" | "mobility";

// Movement pattern: lets the plan engine build balanced days
// (e.g. every leg day gets a squat AND a hinge) instead of random picks.
export type Pattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "push"
  | "pull"
  | "core"
  | "cardio"
  | "mobility"
  | "breathing";

// Role: decides ordering and goal weighting
// (compounds first; fat loss gets more cardio; flexibility gets mobility).
export type Role = "compound" | "isolation" | "cardio" | "mobility";

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  pattern: Pattern;
  role: Role;
  places: Place[];
  level: Level;
  muscles: string[];
  equipment: string[];
  goals: Goal[];
  instructions: string[];
  tips: string[];
  timed?: boolean; // a hold (e.g. plank): measured in seconds, not reps
  mediaUrl?: string;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: number; // a rep count, or seconds when unit is "seconds"
  unit: "reps" | "seconds";
  restSec: number;
}

export interface PlanDay {
  day: number; // 1 = first training day of the week
  title: string;
  exercises: PlannedExercise[];
}

// What the plan engine needs to know about a user.
export interface PlanInput {
  goal: Goal;
  level: Level;
  place: Place;
  daysPerWeek: number;
  age: number;
  week?: number; // 1, 2, 3... drives rotation and progression
}

export interface WeeklyPlan {
  week: number;
  days: PlanDay[];
  notes: string[];
}

// ───────────── Diet ─────────────
// "veg" = no egg, meat or fish. "egg" = veg + eggs. "nonveg" = everything.
export type DietPref = "veg" | "egg" | "nonveg";
export type Budget = "low" | "medium" | "high";
export type Allergen = "peanuts" | "dairy" | "gluten";
export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";

export interface Food {
  id: string;
  name: string;
  unit: string; // how we count it: "katori", "roti", "egg"...
  unitPlural: string;
  step: number; // smallest portion change (0.5 katori, 1 roti)
  kcal: number; // per ONE unit
  protein: number;
  carbs: number;
  fat: number;
  cost: number; // approximate rupees per unit (prices vary by city)
  diet: DietPref;
  allergens: Allergen[];
}

export interface MealCombo {
  id: string;
  slot: MealSlot;
  name: string;
  items: { foodId: string; qty: number }[];
}

export interface PlannedFood {
  foodId: string;
  name: string;
  qty: number;
  label: string; // e.g. "1.5 katori Dal (toor/moong)"
}

export interface PlannedMeal {
  comboId: string;
  slot: MealSlot;
  name: string;
  items: PlannedFood[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  cost: number;
}

export interface DietDay {
  day: number;
  meals: PlannedMeal[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  cost: number;
}

export interface DietTargets {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  showNumbers: boolean; // false for under-18s: no calorie numbers on screen
  notes: string[];
}

export interface DietPlan {
  days: DietDay[];
  targets: DietTargets;
  budgetCap: number;
  avgCost: number;
  daysOverBudget: number;
  notes: string[];
}

export interface UserProfile {
  age: number;
  sex: "male" | "female" | "other";
  heightCm: number;
  weightKg: number;
  goal: Goal;
  level: Level;
  place: Place;
  daysPerWeek: number;
  startedAt: string;
  // Food preferences were added after the first release, so older saved profiles do not have them.
  diet?: DietPref;
  budget?: Budget;
  avoid?: Allergen[]; // ISO date the user began; used to work out which week they are on
}
