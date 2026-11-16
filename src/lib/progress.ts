// Workout history ("progress"), saved on the device. XP, level, streak and badges are all
// DERIVED from this one list (see gamification.ts), so there is a single source of truth
// and the numbers can never drift out of sync.
import { createLocalStore } from "./localStore";
import {
  computeBadges,
  levelInfo,
  qualifies,
  sessionXp,
  totalXp,
  weeklyStreak,
  type Badge,
  type SessionLog,
} from "./gamification";

function parseProgress(raw: string | null): SessionLog[] | null {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return null;
    const valid = data.every(
      (l) =>
        l && typeof l.week === "number" && typeof l.day === "number" && typeof l.title === "string" &&
        typeof l.completedAt === "string" && typeof l.xp === "number" && typeof l.sets === "number",
    );
    return valid ? (data as SessionLog[]) : null;
  } catch {
    return null;
  }
}

const store = createLocalStore<SessionLog[]>("levelup.progress.v1", parseProgress);

export const useProgress = store.useValue;
export const clearProgress = store.clear;

export type SessionResult =
  | { status: "incomplete"; setsDone: number; totalSets: number }
  | { status: "repeat" } // already earned XP for this day this week
  | { status: "save_failed" }
  | {
      status: "completed";
      xpGained: number;
      totalXp: number;
      levelBefore: number;
      levelAfter: number;
      title: string; // level title after
      streakWeeks: number;
      newBadges: Badge[];
    };

// Called once when a workout ends. Decides whether it counts and records it.
export function recordSession(args: {
  week: number;
  day: number;
  title: string;
  setsDone: number;
  totalSets: number;
}): SessionResult {
  const { week, day, title, setsDone, totalSets } = args;
  if (!qualifies(setsDone, totalSets)) return { status: "incomplete", setsDone, totalSets };

  const logs = store.read() ?? [];
  // XP is awarded once per plan day per week, so repeating a workout cannot farm XP.
  if (logs.some((l) => l.week === week && l.day === day)) return { status: "repeat" };

  const entry: SessionLog = {
    week,
    day,
    title,
    completedAt: new Date().toISOString(),
    xp: sessionXp(setsDone, totalSets),
    sets: setsDone,
  };
  const next = [...logs, entry];
  if (!store.save(next)) return { status: "save_failed" };

  const before = new Set(computeBadges(logs, week).filter((b) => b.unlocked).map((b) => b.id));
  const after = levelInfo(totalXp(next));
  return {
    status: "completed",
    xpGained: entry.xp,
    totalXp: after.totalXp,
    levelBefore: levelInfo(totalXp(logs)).level,
    levelAfter: after.level,
    title: after.title,
    streakWeeks: weeklyStreak(next, week).weeks,
    newBadges: computeBadges(next, week).filter((b) => b.unlocked && !before.has(b.id)),
  };
}
