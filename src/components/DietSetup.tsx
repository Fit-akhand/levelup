"use client";

import { useState } from "react";
import { AvoidPicker, BudgetPicker, DietPrefPicker } from "./DietChoices";
import { updateProfile } from "@/lib/storage";
import type { Allergen, Budget, DietPref, UserProfile } from "@/lib/types";

// Asks for food preferences. Used the first time someone opens the meal plan (older profiles were
// created before food questions existed) and when they choose to change their preferences.
export default function DietSetup({ profile, onDone }: { profile: UserProfile; onDone?: () => void }) {
  const [diet, setDiet] = useState<DietPref | "">(profile.diet ?? "");
  const [budget, setBudget] = useState<Budget | "">(profile.budget ?? "");
  const [avoid, setAvoid] = useState<Allergen[]>(profile.avoid ?? []);
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!diet) return setError("Pick what you eat.");
    if (!budget) return setError("Pick a budget.");
    if (!updateProfile({ diet, budget, avoid })) return setError("We could not save. Your browser may be blocking storage.");
    onDone?.();
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 py-8 animate-rise">
      <h1 className="text-3xl font-extrabold tracking-tight">Your meal plan</h1>
      <p className="mt-1 text-muted">Three quick questions so we build meals you can actually eat.</p>

      <h2 className="mt-6 text-lg font-bold">What do you eat?</h2>
      <div className="mt-2">
        <DietPrefPicker value={diet} onChange={(v) => { setDiet(v); setError(null); }} />
      </div>
      <h2 className="mt-6 text-lg font-bold">Daily food budget</h2>
      <div className="mt-2">
        <BudgetPicker value={budget} onChange={(v) => { setBudget(v); setError(null); }} />
      </div>
      <h2 className="mt-6 text-lg font-bold">Foods to avoid</h2>
      <div className="mt-2">
        <AvoidPicker value={avoid} onChange={setAvoid} />
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        {onDone && (
          <button type="button" onClick={onDone} className="btn btn-ghost">
            Cancel
          </button>
        )}
        <button type="button" onClick={save} className="btn btn-primary flex-1">
          Build my meal plan
        </button>
      </div>
    </div>
  );
}
