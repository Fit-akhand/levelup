// Human-friendly text for the internal values (goal ids, levels, places).
// Kept in one place so the form and the plan screen always say the same thing.
import type { Allergen, Budget, DietPref, Goal, Level, MealSlot, Place } from "./types";

// For under-18 users we avoid body-shaming wording: "fat loss" becomes "get active".
export function goalLabel(goal: Goal, teen: boolean): string {
  switch (goal) {
    case "muscle_gain":
      return "Build strength & muscle";
    case "fat_loss":
      return teen ? "Burn energy & get active" : "Lose fat";
    case "stay_fit":
      return "Stay fit & healthy";
    case "flexibility":
      return "Flexibility & calm";
  }
}

export function goalHint(goal: Goal, teen: boolean): string {
  switch (goal) {
    case "muscle_gain":
      return "Heavier-feeling sets, more rest, steady progress.";
    case "fat_loss":
      return teen ? "More movement and cardio, with energy-friendly workouts." : "Shorter rests plus a cardio finisher.";
    case "stay_fit":
      return "A balanced mix to keep your body strong and active.";
    case "flexibility":
      return "Stretching and mobility work on top of light training.";
  }
}

export const DIET_LABEL: Record<DietPref, string> = {
  veg: "Vegetarian",
  egg: "Eggetarian",
  nonveg: "Non-vegetarian",
};

export const DIET_HINT: Record<DietPref, string> = {
  veg: "No eggs, meat or fish.",
  egg: "Vegetarian food plus eggs.",
  nonveg: "Everything, including chicken and fish.",
};

export const BUDGET_LABEL: Record<Budget, string> = {
  low: "Tight budget",
  medium: "Medium budget",
  high: "Flexible budget",
};

export const BUDGET_HINT: Record<Budget, string> = {
  low: "Dal, rice, roti, chana, soya. Up to about ₹150 a day.",
  medium: "More variety, paneer and eggs. Up to about ₹250 a day.",
  high: "Includes chicken, fish and fruit. Up to about ₹400 a day.",
};

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  peanuts: "Peanuts",
  dairy: "Milk and dairy (milk, curd, paneer)",
  gluten: "Gluten (wheat, oats, semolina)",
};

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
};

export const LEVEL_HINT: Record<Level, string> = {
  beginner: "New to training, or getting back after a break.",
  intermediate: "Training regularly for 6+ months and comfortable with form.",
};

export const PLACE_LABEL: Record<Place, string> = {
  gym: "Gym",
  home: "Home",
  yoga: "Yoga",
};

export const PLACE_HINT: Record<Place, string> = {
  gym: "Machines, dumbbells and barbells.",
  home: "Bodyweight, plus a chair or backpack.",
  yoga: "Mat-based flows, stretching and breathing.",
};
