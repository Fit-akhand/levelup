// One place that turns a saved profile into this week's plan, shared by the plan page and the
// workout player so they can never disagree about what "Day 2" contains.
// (The engine is deterministic: same profile + same week = same plan.)
import { useMemo } from "react";
import { generatePlan } from "./engine/generatePlan";
import { library } from "@/data/library";
import { weekSince } from "./storage";
import type { UserProfile, WeeklyPlan } from "./types";

export function usePlan(profile: UserProfile): WeeklyPlan {
  const week = useMemo(() => weekSince(profile.startedAt), [profile.startedAt]);
  return useMemo(
    () =>
      generatePlan(
        {
          goal: profile.goal,
          level: profile.level,
          place: profile.place,
          daysPerWeek: profile.daysPerWeek,
          age: profile.age,
          week,
        },
        library,
      ),
    [profile, week],
  );
}
