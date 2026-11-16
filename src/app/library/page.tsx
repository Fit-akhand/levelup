"use client";

import { useMemo, useState } from "react";
import ExerciseDemo from "@/components/ExerciseDemo";
import { library } from "@/data/library";
import { demoFor } from "@/lib/demo/exerciseDemos";
import { LEVEL_LABEL, PLACE_LABEL } from "@/lib/labels";
import type { Level, Place } from "@/lib/types";

type PlaceFilter = Place | "all";
type LevelFilter = Level | "all";

const chip = (active: boolean) =>
  [
    "rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition",
    active ? "border-primary bg-tint text-accent" : "border-line text-muted hover:border-primary/60",
  ].join(" ");

export default function LibraryPage() {
  const [place, setPlace] = useState<PlaceFilter>("all");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [onlyDemos, setOnlyDemos] = useState(false);
  const [query, setQuery] = useState("");

  const shown = useMemo(
    () =>
      library.filter(
        (e) =>
          (place === "all" || e.places.includes(place)) &&
          (level === "all" || e.level === level) &&
          (!onlyDemos || demoFor(e.id)) &&
          e.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [place, level, onlyDemos, query],
  );

  const withDemo = library.filter((e) => demoFor(e.id)).length;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Exercise library</h1>
      <p className="mt-1 text-muted">
        {library.length} exercises, {withDemo} with animated demos. Demos show the basic movement; always follow the
        written steps and ask a coach if unsure.
      </p>

      <div className="mt-5 space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises"
          aria-label="Search exercises"
          className="w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 outline-none focus:border-primary"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Place">
          {(["all", "gym", "home", "yoga"] as PlaceFilter[]).map((p) => (
            <button key={p} className={chip(place === p)} onClick={() => setPlace(p)}>
              {p === "all" ? "All places" : PLACE_LABEL[p]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Level">
          {(["all", "beginner", "intermediate"] as LevelFilter[]).map((l) => (
            <button key={l} className={chip(level === l)} onClick={() => setLevel(l)}>
              {l === "all" ? "All levels" : LEVEL_LABEL[l]}
            </button>
          ))}
          <button className={chip(onlyDemos)} onClick={() => setOnlyDemos((v) => !v)} aria-pressed={onlyDemos}>
            Only with demo
          </button>
        </div>
      </div>

      <p className="mt-5 text-sm text-muted">{shown.length} shown</p>
      <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((e) => (
          <li key={e.id} className="card p-3">
            {demoFor(e.id) ? (
              <ExerciseDemo exerciseId={e.id} name={e.name} caption={false} />
            ) : (
              <div className="flex aspect-[160/130] items-center justify-center rounded-2xl bg-tint px-3 text-center text-xs text-muted">
                No demo yet. Follow the written steps.
              </div>
            )}
            <h2 className="mt-3 font-bold leading-snug">{e.name}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {e.places.map((p) => PLACE_LABEL[p]).join(", ")} · {LEVEL_LABEL[e.level]} · {e.muscles.slice(0, 3).join(", ")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
