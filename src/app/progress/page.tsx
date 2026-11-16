"use client";

import { useMemo } from "react";
import Link from "next/link";
import ProgressSummary from "@/components/ProgressSummary";
import { LockIcon, TrophyIcon } from "@/components/Icons";
import { LogoMark } from "@/components/Logo";
import { computeBadges } from "@/lib/gamification";
import { useProgress } from "@/lib/progress";
import { useProfile, weekSince } from "@/lib/storage";

export default function ProgressPage() {
  const profile = useProfile();
  const logs = useProgress();
  const week = useMemo(() => (profile ? weekSince(profile.startedAt) : 1), [profile]);

  if (profile === undefined || logs === undefined) {
    return <div className="p-8 text-center text-muted">Loading…</div>;
  }

  if (profile === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <LogoMark size={56} />
        <h1 className="text-2xl font-extrabold tracking-tight">Nothing to show yet</h1>
        <p className="max-w-sm text-muted">Create your plan and finish a workout to start earning XP.</p>
        <Link href="/onboarding" className="btn btn-primary px-10">
          Get started
        </Link>
      </main>
    );
  }

  const list = logs ?? [];
  const badges = computeBadges(list, week);
  const recent = [...list].reverse().slice(0, 10);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8">
      <h1 className="animate-rise text-3xl font-extrabold tracking-tight sm:text-4xl">Your progress</h1>

      <div className="mt-5">
        <ProgressSummary profile={profile} />
      </div>

      <h2 className="mt-8 text-xl font-extrabold tracking-tight">Badges</h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {badges.map((b) => (
          <li key={b.id} className={["card p-4", b.unlocked ? "" : "opacity-60"].join(" ")}>
            <span
              className={[
                "flex h-10 w-10 items-center justify-center rounded-full",
                b.unlocked ? "bg-primary text-on-primary" : "bg-line text-muted",
              ].join(" ")}
            >
              {b.unlocked ? <TrophyIcon size={20} /> : <LockIcon size={20} />}
            </span>
            <p className="mt-2 font-bold leading-tight">{b.name}</p>
            <p className="mt-0.5 text-xs text-muted">{b.description}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-xl font-extrabold tracking-tight">Recent workouts</h2>
      {recent.length === 0 ? (
        <p className="card mt-3 p-5 text-center text-muted">
          No workouts yet. Open{" "}
          <Link href="/plan" className="font-semibold text-accent underline underline-offset-4">
            your plan
          </Link>{" "}
          and press Start on a day.
        </p>
      ) : (
        <ul className="card mt-3 divide-y divide-line">
          {recent.map((l) => (
            <li key={`${l.week}-${l.day}`} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{l.title}</p>
                <p className="text-xs text-muted">
                  Week {l.week} · Day {l.day} · {new Date(l.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-tint px-3 py-1 text-sm font-bold text-accent">+{l.xp} XP</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
