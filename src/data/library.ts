// The one place the app imports exercises from.
// Data is split across files so each stays easy to edit; this merges them.
import type { Exercise } from "@/lib/types";
// Explicit ".ts" extensions let the Node-run scripts and tests load this file too.
import { exercises as coreExercises } from "./exercises.ts";
import { moreExercises } from "./exercises-more.ts";

// Exercises measured in seconds (holds / carries) instead of reps.
const TIMED_IDS = new Set([
  "plank",
  "side-plank",
  "wall-sit",
  "superman",
  "hollow-body-hold",
  "wall-handstand-hold",
  "farmer-carry",
]);

export const library: Exercise[] = [...coreExercises, ...moreExercises].map((e) =>
  TIMED_IDS.has(e.id) ? { ...e, timed: true } : e,
);
