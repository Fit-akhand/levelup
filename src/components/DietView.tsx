"use client";

import { useMemo, useState } from "react";
import DietSetup from "./DietSetup";
import { InfoIcon } from "./Icons";
import { foods } from "@/data/foods";
import { meals } from "@/data/meals";
import { generateDiet } from "@/lib/diet/generateDiet";
import { computeTargets } from "@/lib/diet/nutrition";
import { ALLERGEN_LABEL, BUDGET_LABEL, DIET_LABEL, SLOT_LABEL } from "@/lib/labels";
import type { Allergen, DietPref, UserProfile } from "@/lib/types";

// Protein examples that respect the person's food choices (no eggs for vegetarians, no dairy
// for someone avoiding it...).
function proteinExamples(diet: DietPref, avoid: Allergen[]): string {
  const list = ["dal", "chana", "soya chunks"];
  if (!avoid.includes("dairy")) list.push("curd", "paneer");
  if (diet !== "veg") list.push("eggs");
  if (diet === "nonveg") list.push("chicken", "fish");
  return list.length > 1 ? `${list.slice(0, -1).join(", ")} or ${list[list.length - 1]}` : list[0];
}

// Rendered only once the profile has food preferences (see the diet page).
export default function DietView({ profile }: { profile: UserProfile }) {
  const [editing, setEditing] = useState(false);
  const [variant, setVariant] = useState(0); // bump to "shuffle" the meals
  const [dayNo, setDayNo] = useState(1);

  const diet = profile.diet!;
  const budget = profile.budget!;
  const avoid = useMemo(() => profile.avoid ?? [], [profile.avoid]);

  const plan = useMemo(() => {
    const targets = computeTargets({
      age: profile.age,
      sex: profile.sex,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      goal: profile.goal,
      daysPerWeek: profile.daysPerWeek,
    });
    return generateDiet({ targets, diet, budget, avoid, variant }, foods, meals);
  }, [profile, diet, budget, avoid, variant]);

  if (editing) return <DietSetup profile={profile} onDone={() => setEditing(false)} />;

  const day = plan.days[dayNo - 1];
  const { targets } = plan;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8">
      <div className="animate-rise">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Your meal plan</h1>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
          {[DIET_LABEL[diet], BUDGET_LABEL[budget], ...avoid.map((a) => `No ${ALLERGEN_LABEL[a].split(" (")[0].toLowerCase()}`)].map((c) => (
            <span key={c} className="rounded-full bg-tint px-3 py-1.5 text-accent">
              {c}
            </span>
          ))}
        </div>

        {/* Adults see their targets; under-18s never see calorie numbers. */}
        {targets.showNumbers ? (
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Calories / day", value: `~${targets.kcal}` },
              { label: "Protein", value: `${targets.proteinG} g` },
              { label: "Carbs", value: `${targets.carbsG} g` },
              { label: "Fat", value: `${targets.fatG} g` },
            ].map((s) => (
              <div key={s.label} className="card px-3 py-4 text-center">
                <dd className="text-xl font-extrabold">{s.value}</dd>
                <dt className="mt-0.5 text-xs font-medium text-muted">{s.label}</dt>
              </div>
            ))}
          </dl>
        ) : (
          <div className="card mt-5 p-4 text-sm">
            <p className="font-bold text-accent">Eat well, not less</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              <li>Eat 3 meals and a snack every day. Do not skip meals.</li>
              <li>Fill about half your plate with sabzi, dal and salad.</li>
              <li>Have protein at every meal: {proteinExamples(diet, avoid)}.</li>
              <li>Drink water through the day.</li>
            </ul>
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-tint p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-accent">
            <InfoIcon size={18} /> Good to know
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {plan.notes.map((n) => (
              <li key={n} className="leading-snug">
                {n}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Day picker */}
      <div className="mt-8 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Day of the week">
        {plan.days.map((d) => (
          <button
            key={d.day}
            role="tab"
            aria-selected={dayNo === d.day}
            onClick={() => setDayNo(d.day)}
            className={[
              "shrink-0 rounded-full border-2 px-4 py-2 text-sm font-bold transition",
              dayNo === d.day ? "border-primary bg-primary text-on-primary" : "border-line text-muted hover:border-primary/60",
            ].join(" ")}
          >
            Day {d.day}
          </button>
        ))}
      </div>

      {/* Meals for the chosen day */}
      <div key={`${dayNo}-${variant}`} className="mt-4 space-y-4 animate-rise">
        {day.meals.map((meal, i) => (
          <section key={`${meal.comboId}-${i}`} className="card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-accent">{SLOT_LABEL[meal.slot]}</p>
              <p className="text-xs font-medium text-muted">
                ~₹{meal.cost}
                {targets.showNumbers && ` · ${meal.kcal} kcal · ${meal.protein} g protein`}
              </p>
            </div>
            <h2 className="mt-1 text-lg font-bold leading-snug">{meal.name}</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {meal.items.map((item) => (
                <li key={item.foodId}>• {item.label}</li>
              ))}
            </ul>
          </section>
        ))}

        <div className="card flex flex-wrap items-center justify-between gap-2 bg-tint px-4 py-3 text-sm font-semibold">
          <span>Food cost today: about ₹{day.cost}</span>
          {targets.showNumbers && (
            <span className="text-muted">
              {day.kcal} kcal · {day.protein} g protein
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button className="btn btn-ghost" onClick={() => setVariant((v) => v + 1)}>
          Shuffle meals
        </button>
        <button className="btn btn-ghost" onClick={() => setEditing(true)}>
          Change food preferences
        </button>
      </div>
      <p className="mt-4 text-xs text-muted">
        Average cost this week: about ₹{plan.avgCost} a day (your budget: up to ₹{plan.budgetCap}).
      </p>
    </div>
  );
}
