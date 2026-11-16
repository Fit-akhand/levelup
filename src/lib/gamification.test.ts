import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FULL_COMPLETION_BONUS,
  SESSION_BASE_XP,
  SET_XP,
  computeBadges,
  levelInfo,
  qualifies,
  sessionXp,
  totalXp,
  weeklyStreak,
  xpForLevel,
} from "./gamification.ts";
import type { SessionLog } from "./gamification.ts";

const log = (week: number, day: number, xp = 100): SessionLog => ({
  week,
  day,
  title: `W${week}D${day}`,
  completedAt: "2026-01-01T10:00:00.000Z",
  xp,
  sets: 10,
});

test("a session only counts if at least 60% of sets are done", () => {
  assert.equal(qualifies(5, 10), false);
  assert.equal(qualifies(6, 10), true);
  assert.equal(sessionXp(5, 10), 0);
  assert.equal(qualifies(0, 0), false);
});

test("XP: base + per set, with a bonus for finishing everything", () => {
  assert.equal(sessionXp(6, 10), SESSION_BASE_XP + 6 * SET_XP);
  assert.equal(sessionXp(10, 10), SESSION_BASE_XP + 10 * SET_XP + FULL_COMPLETION_BONUS);
});

test("level thresholds: 0, 100, 300, 600, 1000", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(xpForLevel), [0, 100, 300, 600, 1000]);
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(99).level, 1);
  assert.equal(levelInfo(100).level, 2);
  assert.equal(levelInfo(599).level, 3);
  assert.equal(levelInfo(1000).level, 5);
});

test("level progress is a fraction of the current level", () => {
  const info = levelInfo(150); // level 2 spans 100..300
  assert.equal(info.level, 2);
  assert.equal(info.xpIntoLevel, 50);
  assert.equal(info.xpForNext, 200);
  assert.equal(info.progress, 0.25);
});

test("very high XP still gives a title (does not run off the end)", () => {
  assert.equal(levelInfo(1_000_000).title, "Legend");
});

test("totalXp adds up the log", () => {
  assert.equal(totalXp([log(1, 1, 120), log(1, 2, 80)]), 200);
  assert.equal(totalXp([]), 0);
});

test("streak counts consecutive weeks with 2+ sessions", () => {
  const logs = [log(1, 1), log(1, 2), log(2, 1), log(2, 2), log(3, 1), log(3, 2)];
  assert.equal(weeklyStreak(logs, 3).weeks, 3);
});

test("an unfinished current week does not break the streak", () => {
  const logs = [log(1, 1), log(1, 2), log(2, 1), log(2, 2), log(3, 1)];
  const s = weeklyStreak(logs, 3);
  assert.equal(s.weeks, 2);
  assert.equal(s.thisWeek, 1);
  assert.equal(s.thisWeekGoalMet, false);
});

test("a missed week resets the streak", () => {
  const logs = [log(1, 1), log(1, 2), log(3, 1), log(3, 2)];
  assert.equal(weeklyStreak(logs, 3).weeks, 1); // week 2 was missed, so only week 3 counts
  assert.equal(weeklyStreak(logs, 4).weeks, 1); // week 4 just started; week 3 still counts
  assert.equal(weeklyStreak(logs, 5).weeks, 0); // week 4 passed with nothing
});

test("no sessions means no streak", () => {
  assert.deepEqual(weeklyStreak([], 1), { weeks: 0, thisWeek: 0, thisWeekGoalMet: false });
});

test("badges unlock from the log", () => {
  const none = computeBadges([], 1);
  assert.ok(none.every((b) => !b.unlocked));
  const one = computeBadges([log(1, 1)], 1);
  assert.equal(one.find((b) => b.id === "first")?.unlocked, true);
  assert.equal(one.find((b) => b.id === "five")?.unlocked, false);
  const many = computeBadges(Array.from({ length: 20 }, (_, i) => log(Math.floor(i / 2) + 1, (i % 2) + 1, 100)), 10);
  assert.equal(many.find((b) => b.id === "twenty")?.unlocked, true);
  assert.equal(many.find((b) => b.id === "streak4")?.unlocked, true);
  assert.equal(many.find((b) => b.id === "level5")?.unlocked, true); // 2000 XP
});
