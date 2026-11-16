// The game rules: XP, levels, streaks and badges. All PURE functions (no browser, no React),
// so they are easy to test and easy to tweak. The numbers here are the "tuning knobs".

export interface SessionLog {
  week: number; // plan week the session belonged to
  day: number; // plan day number within that week
  title: string;
  completedAt: string; // ISO date-time
  xp: number;
  sets: number; // sets completed
}

// ───────────── XP ─────────────
export const SESSION_BASE_XP = 40;
export const SET_XP = 5;
export const FULL_COMPLETION_BONUS = 20;
// You must finish at least this share of the sets for the session to count.
// This stops "tap finish immediately" from farming XP.
export const MIN_COMPLETION = 0.6;

export function qualifies(setsDone: number, totalSets: number): boolean {
  return totalSets > 0 && setsDone / totalSets >= MIN_COMPLETION;
}

export function sessionXp(setsDone: number, totalSets: number): number {
  if (!qualifies(setsDone, totalSets)) return 0;
  return SESSION_BASE_XP + SET_XP * setsDone + (setsDone === totalSets ? FULL_COMPLETION_BONUS : 0);
}

export function totalXp(logs: SessionLog[]): number {
  return logs.reduce((sum, l) => sum + l.xp, 0);
}

// ───────────── Levels ─────────────
// Total XP needed to REACH a level: 1 -> 0, 2 -> 100, 3 -> 300, 4 -> 600, 5 -> 1000 ...
// Each level needs 100 more XP than the last, so early levels come fast (good for motivation)
// and later ones take real consistency.
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

const LEVEL_TITLES = ["Rookie", "Mover", "Grinder", "Athlete", "Warrior", "Beast", "Legend"];

export interface LevelInfo {
  level: number;
  title: string;
  totalXp: number;
  xpIntoLevel: number; // XP earned inside this level
  xpForNext: number; // XP needed to complete this level
  progress: number; // 0..1
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const start = xpForLevel(level);
  const span = xpForLevel(level + 1) - start;
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    totalXp: xp,
    xpIntoLevel: xp - start,
    xpForNext: span,
    progress: (xp - start) / span,
  };
}

// ───────────── Streaks ─────────────
// A weekly streak (not a daily one) on purpose: rest days are part of training, and a daily streak
// would pressure teens to train when they should recover.
// A week "counts" when you complete at least WEEKLY_MIN sessions.
export const WEEKLY_MIN = 2;

export interface StreakInfo {
  weeks: number; // consecutive counted weeks
  thisWeek: number; // sessions done in the current week
  thisWeekGoalMet: boolean;
}

export function weeklyStreak(logs: SessionLog[], currentWeek: number): StreakInfo {
  const perWeek = new Map<number, number>();
  for (const l of logs) perWeek.set(l.week, (perWeek.get(l.week) ?? 0) + 1);

  const thisWeek = perWeek.get(currentWeek) ?? 0;
  const goalMet = thisWeek >= WEEKLY_MIN;

  // The current week is still in progress, so an unfinished week does not break the streak yet.
  let cursor = goalMet ? currentWeek : currentWeek - 1;
  let weeks = 0;
  while (cursor >= 1 && (perWeek.get(cursor) ?? 0) >= WEEKLY_MIN) {
    weeks++;
    cursor--;
  }
  return { weeks, thisWeek, thisWeekGoalMet: goalMet };
}

// ───────────── Badges ─────────────
export interface Badge {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

export function computeBadges(logs: SessionLog[], currentWeek: number): Badge[] {
  const sessions = logs.length;
  const streak = weeklyStreak(logs, currentWeek).weeks;
  const level = levelInfo(totalXp(logs)).level;
  return [
    { id: "first", name: "First Rep", description: "Finish your first workout", unlocked: sessions >= 1 },
    { id: "five", name: "Showing Up", description: "Finish 5 workouts", unlocked: sessions >= 5 },
    { id: "twenty", name: "Habit Built", description: "Finish 20 workouts", unlocked: sessions >= 20 },
    { id: "streak2", name: "Two-Week Streak", description: `${WEEKLY_MIN}+ workouts a week for 2 weeks`, unlocked: streak >= 2 },
    { id: "streak4", name: "Month Strong", description: `${WEEKLY_MIN}+ workouts a week for 4 weeks`, unlocked: streak >= 4 },
    { id: "level5", name: "Level 5", description: "Reach level 5", unlocked: level >= 5 },
  ];
}
