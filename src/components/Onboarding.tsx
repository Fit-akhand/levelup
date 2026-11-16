"use client";
// "use client" = this file runs in the browser. We need that because it uses state
// (what the user typed) and event handlers (clicks) — things a server cannot do.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Choice from "./Choice";
import { AvoidPicker, BudgetPicker, DietPrefPicker } from "./DietChoices";
import type { Allergen, Budget, DietPref, Goal, Level, Place, UserProfile } from "@/lib/types";
import { isTeen, maxDaysFor } from "@/lib/engine/rules";
import { saveProfile } from "@/lib/storage";
import { LEVEL_HINT, LEVEL_LABEL, PLACE_HINT, PLACE_LABEL, goalHint, goalLabel } from "@/lib/labels";

type Sex = UserProfile["sex"];

// The draft holds what the user has entered so far. Number inputs are kept as strings
// while typing (so "1" and "" are allowed) and converted to numbers on submit.
interface Draft {
  age: string;
  sex: Sex | "";
  heightCm: string;
  weightKg: string;
  goal: Goal | "";
  level: Level | "";
  place: Place | "";
  days: number; // 0 = not chosen yet
  diet: DietPref | "";
  budget: Budget | "";
  avoid: Allergen[];
}

const EMPTY: Draft = {
  age: "", sex: "", heightCm: "", weightKg: "", goal: "", level: "", place: "", days: 0,
  diet: "", budget: "", avoid: [],
};

const STEPS = [
  "About you", "Your body", "Your goal", "Your level", "Where you train", "Days per week",
  "What you eat", "Food budget", "Foods to avoid",
] as const;
const SUBTITLES = [
  "So we can keep your plan safe and right for your age.",
  "Used to track your progress. Stays on your device.",
  "Pick the one that matters most right now.",
  "Be honest: it keeps workouts safe and fun.",
  "We only pick exercises you can do there.",
  "Start with what you can keep up.",
  "We build your meal plan around this.",
  "Roughly what you can spend on food each day.",
  "We will leave these out of your meals.",
] as const;

const INPUT_CLASS =
  "mt-1.5 w-full rounded-2xl border-2 border-line bg-surface px-4 py-3.5 text-lg outline-none transition placeholder:text-muted/60 focus:border-primary";
const MIN_AGE = 15;

// Returns an error message for the current step, or null if the step is fine.
function validate(step: number, d: Draft): string | null {
  switch (step) {
    case 0: {
      const age = Number(d.age);
      if (!d.age || !Number.isInteger(age)) return "Please enter your age.";
      if (age < MIN_AGE) return `Level Up is for ages ${MIN_AGE} and up.`;
      if (age > 80) return "Please enter an age of 80 or less.";
      if (!d.sex) return "Please pick an option.";
      return null;
    }
    case 1: {
      const h = Number(d.heightCm);
      const w = Number(d.weightKg);
      if (!(h >= 120 && h <= 220)) return "Height should be between 120 and 220 cm.";
      if (!(w >= 30 && w <= 200)) return "Weight should be between 30 and 200 kg.";
      return null;
    }
    case 2:
      return d.goal ? null : "Pick a goal to continue.";
    case 3:
      return d.level ? null : "Pick your level to continue.";
    case 4:
      return d.place ? null : "Pick where you train.";
    case 5:
      return d.days ? null : "Pick how many days you can train.";
    case 6:
      return d.diet ? null : "Pick what you eat.";
    case 7:
      return d.budget ? null : "Pick a budget.";
    default:
      return null; // "foods to avoid" can be empty
  }
}

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const age = Number(draft.age);
  const teen = draft.age !== "" && isTeen(age);
  const maxDays = maxDaysFor(draft.level || "beginner", age || 25);
  const isLast = step === STEPS.length - 1;

  // Update one or more fields; also clear any stale error and an invalid days choice.
  function update(patch: Partial<Draft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      const max = maxDaysFor(next.level || "beginner", Number(next.age) || 25);
      if (next.days > max) next.days = 0; // e.g. switched to a level that allows fewer days
      return next;
    });
    setError(null);
  }

  function next() {
    const problem = validate(step, draft);
    if (problem) return setError(problem);
    if (!isLast) return setStep(step + 1);

    const profile: UserProfile = {
      age: Number(draft.age),
      sex: draft.sex as Sex,
      heightCm: Number(draft.heightCm),
      weightKg: Number(draft.weightKg),
      goal: draft.goal as Goal,
      level: draft.level as Level,
      place: draft.place as Place,
      daysPerWeek: draft.days,
      startedAt: new Date().toISOString(),
      diet: draft.diet as DietPref,
      budget: draft.budget as Budget,
      avoid: draft.avoid,
    };
    if (!saveProfile(profile)) {
      return setError("We could not save your profile. Your browser may be blocking storage (private mode?).");
    }
    router.push("/plan");
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 py-8">
      {/* Progress */}
      <p className="text-sm font-semibold text-accent">
        Step {step + 1} of {STEPS.length}
      </p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        aria-label="Onboarding progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* key={step} makes React treat each step as a new element, so the entrance animation replays. */}
      <div key={step} className="animate-rise">
      <h1 className="mt-7 text-3xl font-extrabold tracking-tight">{STEPS[step]}</h1>
      <p className="mt-1 text-muted">{SUBTITLES[step]}</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault(); // stop the browser reloading the page; we handle it ourselves
          next();
        }}
      >
        {step === 0 && (
          <>
            <label className="block">
              <span className="text-sm font-medium">Your age</span>
              <input
                inputMode="numeric"
                value={draft.age}
                onChange={(e) => update({ age: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                placeholder="e.g. 17"
                className={INPUT_CLASS}
              />
            </label>
            <div role="radiogroup" aria-label="Sex" className="grid grid-cols-3 gap-2">
              {(["male", "female", "other"] as Sex[]).map((s) => (
                <Choice
                  key={s}
                  compact
                  label={s === "other" ? "Other" : s === "male" ? "Male" : "Female"}
                  selected={draft.sex === s}
                  onSelect={() => update({ sex: s })}
                />
              ))}
            </div>
            {teen && (
              <p className="rounded-2xl bg-tint p-4 text-sm">
                You are under 18, so your plan focuses on good technique and safe, gentler workouts. Please ask a
                parent or guardian before starting a new exercise routine.
              </p>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <label className="block">
              <span className="text-sm font-medium">Height (cm)</span>
              <input
                inputMode="numeric"
                value={draft.heightCm}
                onChange={(e) => update({ heightCm: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                placeholder="e.g. 168"
                className={INPUT_CLASS}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Weight (kg)</span>
              <input
                inputMode="decimal"
                value={draft.weightKg}
                onChange={(e) => update({ weightKg: e.target.value.replace(/[^\d.]/g, "").slice(0, 5) })}
                placeholder="e.g. 58"
                className={INPUT_CLASS}
              />
            </label>
          </>
        )}

        {step === 2 && (
          <div role="radiogroup" aria-label="Goal" className="space-y-2">
            {(["muscle_gain", "fat_loss", "stay_fit", "flexibility"] as Goal[]).map((g) => (
              <Choice
                key={g}
                label={goalLabel(g, teen)}
                hint={goalHint(g, teen)}
                selected={draft.goal === g}
                onSelect={() => update({ goal: g })}
              />
            ))}
          </div>
        )}

        {step === 3 && (
          <div role="radiogroup" aria-label="Level" className="space-y-2">
            {(["beginner", "intermediate"] as Level[]).map((l) => (
              <Choice
                key={l}
                label={LEVEL_LABEL[l]}
                hint={LEVEL_HINT[l]}
                selected={draft.level === l}
                onSelect={() => update({ level: l })}
              />
            ))}
          </div>
        )}

        {step === 4 && (
          <div role="radiogroup" aria-label="Place" className="space-y-2">
            {(["gym", "home", "yoga"] as Place[]).map((p) => (
              <Choice
                key={p}
                label={PLACE_LABEL[p]}
                hint={PLACE_HINT[p]}
                selected={draft.place === p}
                onSelect={() => update({ place: p })}
              />
            ))}
          </div>
        )}

        {step === 5 && (
          <>
            <div role="radiogroup" aria-label="Days per week" className="grid grid-cols-5 gap-2">
              {[2, 3, 4, 5, 6].map((n) => (
                <Choice
                  key={n}
                  compact
                  label={String(n)}
                  selected={draft.days === n}
                  disabled={n > maxDays}
                  onSelect={() => update({ days: n })}
                />
              ))}
            </div>
            <p className="text-sm text-muted">
              {maxDays < 6
                ? `For your level${teen ? " and age" : ""}, we cap training at ${maxDays} days so your body can recover.`
                : "Rest days matter: muscles grow while you recover."}
            </p>
          </>
        )}

        {step === 6 && <DietPrefPicker value={draft.diet} onChange={(diet) => update({ diet })} />}
        {step === 7 && <BudgetPicker value={draft.budget} onChange={(budget) => update({ budget })} />}
        {step === 8 && <AvoidPicker value={draft.avoid} onChange={(avoid) => update({ avoid })} />}

        {error && (
          <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <button type="button" onClick={back} className="btn btn-ghost">
              Back
            </button>
          )}
          <button type="submit" className="btn btn-primary flex-1">
            {isLast ? "Create my plan" : "Next"}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
