// The user's profile, saved in the BROWSER (localStorage) on their own device only.
// Nothing is sent to a server. That is also why it is the right choice for the MVP:
// no accounts, no database, and no personal data of minors leaves their phone.
import { createLocalStore } from "./localStore";
import type { Allergen, Budget, DietPref, Goal, Level, Place, UserProfile } from "./types";

const GOALS: Goal[] = ["fat_loss", "muscle_gain", "stay_fit", "flexibility"];
const LEVELS: Level[] = ["beginner", "intermediate"];
const PLACES: Place[] = ["gym", "home", "yoga"];
const DIETS: DietPref[] = ["veg", "egg", "nonveg"];
const BUDGETS: Budget[] = ["low", "medium", "high"];
const ALLERGENS: Allergen[] = ["peanuts", "dairy", "gluten"];

// Data from localStorage is untrusted (old versions, hand edits): validate before using it.
export function parseProfile(raw: string | null): UserProfile | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<UserProfile>;
    const ok =
      typeof p.age === "number" && p.age >= 15 && p.age <= 80 &&
      (p.sex === "male" || p.sex === "female" || p.sex === "other") &&
      typeof p.heightCm === "number" &&
      typeof p.weightKg === "number" &&
      GOALS.includes(p.goal as Goal) &&
      LEVELS.includes(p.level as Level) &&
      PLACES.includes(p.place as Place) &&
      typeof p.daysPerWeek === "number" &&
      typeof p.startedAt === "string" &&
      // Food preferences are optional (older profiles lack them) but must be valid if present.
      (p.diet === undefined || DIETS.includes(p.diet)) &&
      (p.budget === undefined || BUDGETS.includes(p.budget)) &&
      (p.avoid === undefined || (Array.isArray(p.avoid) && p.avoid.every((a) => ALLERGENS.includes(a))));
    return ok ? (p as UserProfile) : null;
  } catch {
    return null;
  }
}

const store = createLocalStore<UserProfile>("levelup.profile.v1", parseProfile);

export const saveProfile = store.save;
export const clearProfile = store.clear;
export const useProfile = store.useValue;

// Change a few fields of the saved profile (e.g. food preferences) without touching the rest.
export function updateProfile(patch: Partial<UserProfile>): boolean {
  const current = store.read();
  return current ? store.save({ ...current, ...patch }) : false;
}

// Which training week the user is on (1, 2, 3...), counted from the day they started.
export function weekSince(startedAt: string): number {
  const days = (Date.now() - new Date(startedAt).getTime()) / 86_400_000;
  return Math.max(1, Math.floor(days / 7) + 1);
}
