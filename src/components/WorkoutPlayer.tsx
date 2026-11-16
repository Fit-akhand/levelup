"use client";
// The workout player: a small state machine that walks through a day's exercises, set by set.
//
//   intro ──start──▶ work ──set done──▶ rest ──timer ends / skip──▶ work ... ──last set──▶ done
//
// "phase" says which screen we are on; "stepIdx" says which set we are on. A STEP is one set of
// one exercise (3 exercises x 3 sets = 9 steps), which keeps the logic simple.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ExerciseDemo from "./ExerciseDemo";
import XpBar from "./XpBar";
import { CheckIcon, FlameIcon, PlayIcon, TrophyIcon, XIcon } from "./Icons";
import { library } from "@/data/library";
import { demoFor } from "@/lib/demo/exerciseDemos";
import { levelInfo } from "@/lib/gamification";
import { recordSession, type SessionResult } from "@/lib/progress";
import { useProfile } from "@/lib/storage";
import { useCountdown } from "@/lib/useCountdown";
import { usePlan } from "@/lib/usePlan";
import type { Exercise, PlanDay, PlannedExercise, UserProfile } from "@/lib/types";

const exerciseById = new Map(library.map((e) => [e.id, e]));

interface Step {
  exIdx: number; // which exercise in the day (0-based)
  setNo: number; // which set of that exercise (1-based)
  setsTotal: number;
  ex: Exercise;
  planned: PlannedExercise;
}

type Phase = "intro" | "work" | "rest" | "done";

// 75 -> "1:15", 45 -> "45"
function fmt(seconds: number): string {
  if (seconds < 60) return String(seconds);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function target(p: PlannedExercise): string {
  return p.unit === "seconds" ? `${p.reps} seconds` : `${p.reps} reps`;
}

// ───────────────────────── Entry: load profile and find the day ─────────────────────────

export default function WorkoutPlayer() {
  const params = useParams<{ day: string }>();
  const profile = useProfile();

  if (profile === undefined) {
    return <div className="p-8 text-center text-muted">Loading…</div>;
  }
  if (profile === null) {
    return (
      <Centered title="No plan yet" text="Create your plan first, then start a workout.">
        <Link href="/onboarding" className="btn btn-primary px-10">
          Get started
        </Link>
      </Centered>
    );
  }
  return <WithProfile profile={profile} dayParam={params.day} />;
}

function WithProfile({ profile, dayParam }: { profile: UserProfile; dayParam: string }) {
  const plan = usePlan(profile);
  const day = plan.days.find((d) => d.day === Number(dayParam));

  if (!day) {
    return (
      <Centered title="Workout not found" text="That day is not part of your plan.">
        <Link href="/plan" className="btn btn-primary px-10">
          Back to my plan
        </Link>
      </Centered>
    );
  }
  // key= makes React start a brand-new session if the day or week changes.
  return <Session key={`${plan.week}-${day.day}`} day={day} week={plan.week} />;
}

function Centered({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      <p className="max-w-sm text-muted">{text}</p>
      {children}
    </main>
  );
}

// ───────────────────────── The session itself ─────────────────────────

function Session({ day, week }: { day: PlanDay; week: number }) {
  const router = useRouter();

  // Flatten "exercise x sets" into a list of steps.
  const steps = useMemo<Step[]>(
    () =>
      day.exercises.flatMap((planned, exIdx) => {
        const ex = exerciseById.get(planned.exerciseId);
        if (!ex) return [];
        return Array.from({ length: planned.sets }, (_, i) => ({
          exIdx,
          setNo: i + 1,
          setsTotal: planned.sets,
          ex,
          planned,
        }));
      }),
    [day],
  );

  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIdx, setStepIdx] = useState(0);
  const [doneSets, setDoneSets] = useState<boolean[]>(() => steps.map(() => false));
  const [restTotal, setRestTotal] = useState(0);
  const [result, setResult] = useState<SessionResult | null>(null);

  const work = useCountdown(() => {
    // A short buzz when a timed hold ends (works on most phones; harmless elsewhere).
    try {
      navigator.vibrate?.(200);
    } catch {
      /* not supported */
    }
  });
  const rest = useCountdown(() => goToStep(stepIdx + 1));

  const doneCount = doneSets.filter(Boolean).length;
  const step = steps[stepIdx];

  function goToStep(i: number, done: boolean[] = doneSets) {
    if (i >= steps.length) return finish(done);
    work.stop();
    rest.stop();
    setStepIdx(i);
    setPhase("work");
  }

  function finish(done: boolean[]) {
    work.stop();
    rest.stop();
    // The only place we write to storage: once, when the workout ends.
    setResult(
      recordSession({
        week,
        day: day.day,
        title: day.title,
        setsDone: done.filter(Boolean).length,
        totalSets: steps.length,
      }),
    );
    setPhase("done");
  }

  function completeSet() {
    const next = doneSets.map((d, i) => (i === stepIdx ? true : d));
    setDoneSets(next);
    work.stop();
    if (stepIdx + 1 >= steps.length) return finish(next);
    const restSec = step.planned.restSec;
    if (restSec > 0) {
      setRestTotal(restSec);
      setPhase("rest");
      rest.start(restSec);
    } else {
      goToStep(stepIdx + 1, next);
    }
  }

  function skipExercise() {
    const nextIdx = steps.findIndex((s) => s.exIdx > step.exIdx);
    if (nextIdx === -1) finish(doneSets);
    else goToStep(nextIdx);
  }

  function quit() {
    if (window.confirm("Quit this workout? Nothing from this session will be saved.")) router.push("/plan");
  }

  if (steps.length === 0) {
    return (
      <Centered title="Nothing to do" text="This day has no exercises.">
        <Link href="/plan" className="btn btn-primary px-10">
          Back to my plan
        </Link>
      </Centered>
    );
  }

  // ───── Intro ─────
  if (phase === "intro") {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-8 animate-rise">
        <p className="text-sm font-semibold text-accent">Day {day.day}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{day.title}</h1>
        <p className="mt-1 text-muted">
          {day.exercises.length} exercises · {steps.length} sets
        </p>

        <div className="mt-5 rounded-2xl bg-tint p-4 text-sm">
          <p className="font-bold text-accent">Warm up first (about 5 minutes)</p>
          <p className="mt-1">March in place, circle your arms and hips, and do a few easy bodyweight squats.</p>
        </div>

        <ol className="card mt-5 divide-y divide-line">
          {day.exercises.map((p, i) => (
            <li key={p.exerciseId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-semibold">
                {i + 1}. {exerciseById.get(p.exerciseId)?.name}
              </span>
              <span className="shrink-0 text-muted">
                {p.sets} × {p.unit === "seconds" ? `${p.reps}s` : p.reps}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex gap-3">
          <Link href="/plan" className="btn btn-ghost">
            Back
          </Link>
          <button className="btn btn-primary flex-1" onClick={() => goToStep(0)}>
            <PlayIcon size={18} /> Start workout
          </button>
        </div>
      </div>
    );
  }

  // ───── Done ─────
  if (phase === "done" && result) {
    return <Summary result={result} />;
  }

  // ───── Work / Rest share a frame: top bar with quit + progress ─────
  const pct = Math.round((doneCount / steps.length) * 100);
  const nextStep = steps[stepIdx + 1];

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-5">
      <div className="flex items-center gap-3">
        <button onClick={quit} className="btn btn-ghost btn-sm !px-3" aria-label="Quit workout">
          <XIcon size={18} />
        </button>
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Workout progress"
        >
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-semibold text-muted">
          {doneCount}/{steps.length}
        </span>
      </div>

      {phase === "rest" && nextStep ? (
        <div key={`rest-${stepIdx}`} className="flex flex-1 flex-col items-center justify-center py-8 text-center animate-rise">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Rest</p>
          <p className="mt-2 text-8xl font-extrabold tabular-nums" aria-live="off">
            {fmt(rest.remaining)}
          </p>
          <div className="mt-4 h-2 w-48 overflow-hidden rounded-full bg-line" aria-hidden>
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${restTotal ? (rest.remaining / restTotal) * 100 : 0}%` }}
            />
          </div>
          <div className="card mt-8 w-full p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Up next</p>
            <p className="mt-1 text-lg font-bold">{nextStep.ex.name}</p>
            <p className="text-sm text-muted">
              Set {nextStep.setNo} of {nextStep.setsTotal} · {target(nextStep.planned)}
            </p>
          </div>
          <div className="mt-6 flex w-full gap-3">
            <button className="btn btn-ghost flex-1" onClick={() => rest.addTime(15)}>
              +15s
            </button>
            <button
              className="btn btn-primary flex-1"
              onClick={() => {
                rest.stop();
                goToStep(stepIdx + 1);
              }}
            >
              Skip rest
            </button>
          </div>
        </div>
      ) : (
        <div key={`work-${stepIdx}`} className="flex flex-1 flex-col py-6 animate-rise">
          <p className="text-sm font-semibold text-accent">
            Exercise {step.exIdx + 1} of {day.exercises.length}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight">{step.ex.name}</h1>
          <p className="mt-1 text-muted">
            Set {step.setNo} of {step.setsTotal}
          </p>

          {/* Demo (when one exists) sits beside the big target */}
          <div className={["mt-5 grid gap-3", demoFor(step.ex.id) ? "grid-cols-2" : "grid-cols-1"].join(" ")}>
          {demoFor(step.ex.id) && <ExerciseDemo exerciseId={step.ex.id} name={step.ex.name} />}
          <div className="card flex flex-col items-center justify-center px-4 py-6">
            {step.planned.unit === "seconds" ? (
              <>
                <p className="text-7xl font-extrabold tabular-nums">
                  {work.running || work.finished ? fmt(work.remaining) : fmt(step.planned.reps)}
                </p>
                <p className="mt-1 text-sm font-medium text-muted">
                  {work.finished ? "Time! Nice work" : work.running ? "Keep going" : "seconds"}
                </p>
                {!work.running && !work.finished && (
                  <button className="btn btn-ghost btn-sm mt-4" onClick={() => work.start(step.planned.reps)}>
                    <PlayIcon size={16} /> Start timer
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-7xl font-extrabold tabular-nums">{step.planned.reps}</p>
                <p className="mt-1 text-sm font-medium text-muted">reps</p>
              </>
            )}
          </div>
          </div>

          {/* How-to: teens learn form here, so it stays visible */}
          <ol className="mt-5 list-decimal space-y-1.5 pl-5 text-sm text-muted marker:font-semibold marker:text-accent">
            {step.ex.instructions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {step.ex.tips[0] && (
            <p className="mt-3 rounded-xl bg-tint px-3 py-2 text-sm font-medium text-accent">Tip: {step.ex.tips[0]}</p>
          )}

          <div className="mt-auto pt-6">
            <button className="btn btn-primary w-full text-lg" onClick={completeSet}>
              <CheckIcon size={20} /> Set done
            </button>
            <div className="mt-3 flex justify-between text-sm font-semibold text-muted">
              <button className="rounded-lg px-2 py-2 hover:text-foreground" onClick={skipExercise}>
                Skip exercise
              </button>
              <button className="rounded-lg px-2 py-2 hover:text-foreground" onClick={() => finish(doneSets)}>
                End workout here
              </button>
            </div>
            <p className="mt-1 text-center text-xs text-muted">Sharp pain? Stop and tell a coach or doctor.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Summary ─────────────────────────

function Summary({ result }: { result: SessionResult }) {
  if (result.status === "completed") {
    const info = levelInfo(result.totalXp);
    const leveledUp = result.levelAfter > result.levelBefore;
    return (
      <div className="mx-auto w-full max-w-md px-5 py-10 text-center animate-rise">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary">
          <TrophyIcon size={32} />
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Workout complete!</h1>
        <p className="mt-3 text-5xl font-extrabold text-accent">+{result.xpGained} XP</p>

        {leveledUp && (
          <p className="mt-4 rounded-2xl bg-primary px-4 py-3 text-lg font-extrabold text-on-primary">
            Level up! You are now Level {result.levelAfter}: {result.title}
          </p>
        )}

        <div className="card mt-6 p-4 text-left">
          <XpBar info={info} />
          <p className="mt-4 flex items-center gap-2 text-sm font-semibold">
            <span className={result.streakWeeks > 0 ? "text-orange-500" : "text-muted"}>
              <FlameIcon size={20} />
            </span>
            {result.streakWeeks > 0
              ? `${result.streakWeeks} week streak`
              : "Do 2 workouts this week to start a streak"}
          </p>
        </div>

        {result.newBadges.length > 0 && (
          <div className="card mt-4 p-4 text-left">
            <p className="text-sm font-bold text-accent">New badge{result.newBadges.length > 1 ? "s" : ""}</p>
            <ul className="mt-2 space-y-1.5">
              {result.newBadges.map((b) => (
                <li key={b.id} className="text-sm">
                  <span className="font-bold">{b.name}</span> <span className="text-muted">· {b.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <SummaryButtons />
      </div>
    );
  }

  const message =
    result.status === "repeat"
      ? { title: "Nice, you did it again!", text: "You already earned XP for this workout this week. Repeats are great practice, but they do not earn extra XP." }
      : result.status === "incomplete"
        ? { title: "Workout ended early", text: `You finished ${result.setsDone} of ${result.totalSets} sets. Complete at least 60% of the sets to earn XP. Any movement still counts for your body.` }
        : { title: "Could not save your progress", text: "Your browser is blocking storage (private mode?). Your workout is fine, but we could not record the XP." };

  return (
    <div className="mx-auto w-full max-w-md px-5 py-10 text-center animate-rise">
      <h1 className="text-3xl font-extrabold tracking-tight">{message.title}</h1>
      <p className="mt-3 text-muted">{message.text}</p>
      <SummaryButtons />
    </div>
  );
}

function SummaryButtons() {
  return (
    <div className="mt-8 flex flex-col gap-3">
      <Link href="/plan" className="btn btn-primary">
        Back to my plan
      </Link>
      <Link href="/progress" className="btn btn-ghost">
        See my progress
      </Link>
    </div>
  );
}
