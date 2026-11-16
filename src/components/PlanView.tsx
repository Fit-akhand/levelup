"use client";

import Link from "next/link";
import { isTeen } from "@/lib/engine/rules";
import { library } from "@/data/library";
import { LEVEL_LABEL, PLACE_LABEL, goalLabel } from "@/lib/labels";
import { clearProfile } from "@/lib/storage";
import { clearProgress, useProgress } from "@/lib/progress";
import { usePlan } from "@/lib/usePlan";
import type { Exercise, PlanDay, PlannedExercise, UserProfile } from "@/lib/types";
import { CheckIcon, ChevronDownIcon, ClockIcon, InfoIcon, PlayIcon } from "./Icons";
import ExerciseDemo from "./ExerciseDemo";
import ProgressSummary from "./ProgressSummary";

const exerciseById = new Map(library.map((e) => [e.id, e]));

function amount(x: PlannedExercise): string {
  return x.unit === "seconds" ? `${x.sets} × ${x.reps}s` : `${x.sets} × ${x.reps}`;
}

// A short label for the kind of work, shown as a small tag.
function kindLabel(e: Exercise): string {
  if (e.pattern === "cardio") return "Cardio";
  if (e.pattern === "mobility" || e.pattern === "breathing") return e.type === "yoga" ? "Yoga" : "Stretch";
  if (e.pattern === "core") return "Core";
  return e.role === "compound" ? "Strength" : "Isolation";
}

// Rough session length: ~3 seconds per rep, or the timed seconds, plus rest, plus a 5 minute warm-up.
function estimateMinutes(day: PlanDay): number {
  const seconds = day.exercises.reduce((total, x) => {
    const work = x.unit === "seconds" ? x.reps : x.reps * 3;
    return total + x.sets * (work + x.restSec);
  }, 0);
  return Math.round(seconds / 60) + 5;
}

export default function PlanView({ profile }: { profile: UserProfile }) {
  const teen = isTeen(profile.age);
  const plan = usePlan(profile); // runs the plan engine (remembered until the profile changes)
  const logs = useProgress();
  const isDone = (dayNo: number) => (logs ?? []).some((l) => l.week === plan.week && l.day === dayNo);

  const totalExercises = plan.days.reduce((n, d) => n + d.exercises.length, 0);
  const avgMinutes = Math.round(plan.days.reduce((n, d) => n + estimateMinutes(d), 0) / plan.days.length);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8">
      <div className="animate-rise">
        <p className="text-sm font-semibold text-accent">Week {plan.week}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Your plan</h1>
        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
          {[goalLabel(profile.goal, teen), LEVEL_LABEL[profile.level], PLACE_LABEL[profile.place]].map((chip) => (
            <span key={chip} className="rounded-full bg-tint px-3 py-1.5 text-accent">
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-5">
          <ProgressSummary profile={profile} />
        </div>

        {/* Quick stats */}
        <dl className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "Days a week", value: String(plan.days.length) },
            { label: "Exercises", value: String(totalExercises) },
            { label: "Min / session", value: `~${avgMinutes}` },
          ].map((s) => (
            <div key={s.label} className="card px-3 py-4 text-center">
              <dd className="text-2xl font-extrabold">{s.value}</dd>
              <dt className="mt-0.5 text-xs font-medium text-muted">{s.label}</dt>
            </div>
          ))}
        </dl>

        {/* Safety notes */}
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

      <div className="mt-8 space-y-5">
        {plan.days.map((day, i) => (
          <section
            key={day.day}
            className="card animate-rise overflow-hidden"
            style={{ animationDelay: `${Math.min(i, 5) * 70}ms` }}
          >
            <header className="flex items-center gap-3 border-b border-line bg-tint px-4 py-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-on-primary">
                {day.day}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold leading-tight">{day.title}</h2>
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <ClockIcon size={14} /> ~{estimateMinutes(day)} min · {day.exercises.length} exercises
                </p>
              </div>
              {isDone(day.day) && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-extrabold text-on-primary">
                  <CheckIcon size={14} /> Done
                </span>
              )}
              <Link href={`/workout/${day.day}`} className="btn btn-primary btn-sm shrink-0">
                <PlayIcon size={14} /> {isDone(day.day) ? "Redo" : "Start"}
              </Link>
            </header>

            <ol className="divide-y divide-line">
              {day.exercises.map((x, idx) => {
                const e = exerciseById.get(x.exerciseId);
                if (!e) return null;
                return (
                  <li key={x.exerciseId}>
                    {/* <details> gives us show/hide for free, no state needed.
                        "group" + "group-open:" lets the chevron rotate when it opens. */}
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 hover:bg-tint/50 [&::-webkit-details-marker]:hidden">
                        <span className="w-5 shrink-0 text-center text-sm font-semibold text-muted">{idx + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold leading-snug">{e.name}</span>
                          <span className="mt-0.5 block text-xs font-medium text-muted">{kindLabel(e)}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block rounded-full bg-tint px-3 py-1 text-sm font-bold text-accent">{amount(x)}</span>
                          {x.restSec > 0 && <span className="mt-0.5 block text-xs text-muted">rest {x.restSec}s</span>}
                        </span>
                        <span className="shrink-0 text-muted transition-transform group-open:rotate-180">
                          <ChevronDownIcon size={18} />
                        </span>
                      </summary>
                      <div className="space-y-3 px-4 pb-4 pl-12 text-sm">
                        {/* Shown only for exercises that have a matching demo template */}
                        <div className="max-w-[240px]">
                          <ExerciseDemo exerciseId={e.id} name={e.name} />
                        </div>
                        <ol className="list-decimal space-y-1.5 pl-5 text-muted marker:font-semibold marker:text-accent">
                          {e.instructions.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                        {e.tips.length > 0 && (
                          <p className="rounded-xl bg-tint px-3 py-2 font-medium text-accent">Tip: {e.tips[0]}</p>
                        )}
                        <p className="text-xs text-muted">
                          Works: {e.muscles.join(", ")} · Needs: {e.equipment.join(", ")}
                        </p>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/onboarding"
          onClick={(e) => {
            // Starting over resets the plan AND the XP (week numbers restart), so confirm first.
            if (!window.confirm("Start over? This resets your plan, XP and streak.")) {
              e.preventDefault();
              return;
            }
            clearProfile();
            clearProgress();
          }}
          className="btn btn-ghost"
        >
          Start over
        </Link>
      </div>
    </div>
  );
}
