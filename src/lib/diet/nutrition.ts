// Daily calorie and protein targets. Pure functions, no browser or React.
//
// SAFETY RULES (each one is covered by a test):
//  1. Under-18s NEVER get a calorie deficit, and the app never shows them calorie numbers.
//     Dieting in the teen years can harm growth and trigger eating disorders.
//  2. Adults get a modest deficit at most (15%), never below a calorie floor.
//  3. An adult whose BMI is in the underweight range never gets a deficit.
// These are general guidelines, not medical advice. A doctor or dietitian should review.
import type { DietTargets, Goal } from "../types.ts";

export interface NutritionInput {
  age: number;
  sex: "male" | "female" | "other";
  heightCm: number;
  weightKg: number;
  goal: Goal;
  daysPerWeek: number;
}

export function bmi(heightCm: number, weightKg: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

// Mifflin-St Jeor: a widely used estimate of calories burned at rest (BMR).
export function bmr(input: Pick<NutritionInput, "age" | "sex" | "heightCm" | "weightKg">): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  if (input.sex === "male") return base + 5;
  if (input.sex === "female") return base - 161;
  return base - 78; // midpoint for "other"
}

// Multiplier for total daily energy from how many days a week the person trains.
const ACTIVITY: Record<number, number> = { 2: 1.35, 3: 1.4, 4: 1.5, 5: 1.55, 6: 1.6 };

// Calorie floors, so a plan can never ask for too little food.
const ADULT_FLOOR = { male: 1500, female: 1200, other: 1350 } as const;
const TEEN_FLOOR = { male: 2000, female: 1800, other: 1900 } as const;
const TEEN_CEILING = 3200;
const FAT_LOSS_DEFICIT = 0.15;
const MUSCLE_SURPLUS = 0.1;
const UNDERWEIGHT_BMI = 18.5;

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export function computeTargets(input: NutritionInput): DietTargets {
  const teen = input.age < 18;
  const notes: string[] = [];
  const days = Math.min(Math.max(Math.round(input.daysPerWeek), 2), 6);
  const maintenance = bmr(input) * ACTIVITY[days];

  let kcal: number;

  if (teen) {
    // Rule 1: no deficit, ever. A small surplus only for muscle gain, since teens are still growing.
    kcal = maintenance * (input.goal === "muscle_gain" ? 1.05 : 1.0);
    kcal = Math.min(Math.max(kcal, TEEN_FLOOR[input.sex]), TEEN_CEILING);
    notes.push("Your body is still growing, so this plan is about eating enough, regular meals and plenty of protein. It is not about dieting.");
  } else {
    let factor = 1;
    if (input.goal === "muscle_gain") factor = 1 + MUSCLE_SURPLUS;
    if (input.goal === "fat_loss") {
      if (bmi(input.heightCm, input.weightKg) < UNDERWEIGHT_BMI) {
        // Rule 3
        notes.push("Your BMI is in the underweight range, so we are not reducing your calories. Please talk to a doctor before changing your weight.");
      } else {
        factor = 1 - FAT_LOSS_DEFICIT;
      }
    }
    // Rule 2: a floor, and never below resting energy needs.
    kcal = Math.max(maintenance * factor, ADULT_FLOOR[input.sex], bmr(input));
    if (input.goal === "fat_loss" && factor < 1) {
      notes.push("A gentle 15% calorie reduction for slow, steady fat loss. Going lower is not safer or faster.");
    }
  }
  kcal = roundTo(kcal, 50);

  // Protein per kg of body weight.
  const perKg = teen
    ? input.goal === "muscle_gain" ? 1.5 : 1.2
    : { muscle_gain: 1.8, fat_loss: 1.8, stay_fit: 1.4, flexibility: 1.2 }[input.goal];
  const proteinG = Math.min(Math.round(perKg * input.weightKg), Math.round((kcal * 0.35) / 4)); // protein <= 35% of calories
  const fatG = Math.round((kcal * (teen ? 0.3 : 0.25)) / 9);
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));

  return { kcal, proteinG, carbsG, fatG, showNumbers: !teen, notes };
}
