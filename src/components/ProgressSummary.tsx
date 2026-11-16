"use client";

import { useMemo } from "react";
import XpBar from "./XpBar";
import { FlameIcon } from "./Icons";
import { WEEKLY_MIN, levelInfo, totalXp, weeklyStreak } from "@/lib/gamification";
import { useProgress } from "@/lib/progress";
import { weekSince } from "@/lib/storage";
import type { UserProfile } from "@/lib/types";

// The level card: XP bar, weekly streak, and this week's sessions. Used on the plan and progress pages.
export default function ProgressSummary({ profile }: { profile: UserProfile }) {
  const logs = useProgress();
  const week = useMemo(() => weekSince(profile.startedAt), [profile.startedAt]);

  if (logs === undefined) return null; // still loading from the device

  const list = logs ?? [];
  const info = levelInfo(totalXp(list));
  const streak = weeklyStreak(list, week);

  return (
    <section className="card p-4" aria-label="Your progress">
      <XpBar info={info} />
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 rounded-xl bg-tint px-3 py-2.5">
          <span className={streak.weeks > 0 ? "text-orange-500" : "text-muted"}>
            <FlameIcon size={22} />
          </span>
          <div>
            <p className="font-extrabold leading-tight">
              {streak.weeks} week{streak.weeks === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-muted">streak</p>
          </div>
        </div>
        <div className="rounded-xl bg-tint px-3 py-2.5">
          <p className="font-extrabold leading-tight">
            {Math.min(streak.thisWeek, WEEKLY_MIN)} / {WEEKLY_MIN}
          </p>
          <p className="text-xs text-muted">workouts this week</p>
        </div>
      </div>
    </section>
  );
}
