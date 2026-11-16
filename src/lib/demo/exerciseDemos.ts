// Which exercise uses which movement template (and which prop it holds).
// An exercise that is NOT listed here simply shows no demo. That is deliberate: a demo that
// does not match the real movement is worse than no demo.
import type { Prop } from "./skeleton.ts";

export interface DemoSpec {
  template: string;
  prop?: Prop; // object held in the hands (or on the back)
}

const d = (template: string, prop?: Prop): DemoSpec => ({ template, prop });

export const EXERCISE_DEMOS: Record<string, DemoSpec> = {
  // squats
  "bodyweight-squat": d("squat_bw"),
  "chair-squat": d("squat_bw"),
  "sumo-squat": d("squat_bw"),
  "goblet-squat": d("squat_goblet", "dumbbell"),
  "front-squat": d("squat_goblet", "barbell"),
  "barbell-back-squat": d("squat_back", "bar_back"),
  "wall-sit": d("wall_sit"),
  // hinges & glutes
  "romanian-deadlift": d("hinge", "barbell"),
  "conventional-deadlift": d("hinge", "barbell"),
  "dumbbell-rdl": d("hinge", "dumbbell"),
  "good-morning": d("hinge"),
  "single-leg-rdl": d("single_leg_hinge"),
  "kettlebell-swing": d("kb_swing", "kettlebell"),
  "glute-bridge": d("glute_bridge"),
  "dumbbell-hip-thrust": d("glute_bridge"),
  "barbell-hip-thrust": d("glute_bridge"),
  "single-leg-glute-bridge": d("single_leg_bridge"),
  // push-ups & planks
  "push-up": d("push_up"),
  "wide-push-up": d("push_up"),
  "diamond-push-up": d("push_up"),
  "knee-push-up": d("knee_push_up"),
  "incline-push-up": d("incline_push_up"),
  "decline-push-up": d("decline_push_up"),
  "pike-push-up": d("pike_push_up"),
  plank: d("plank"),
  "mountain-climbers": d("mountain_climber"),
  // lunges
  "reverse-lunge": d("lunge"),
  "walking-lunge": d("lunge", "dumbbell"),
  // pressing
  "dumbbell-bench-press": d("bench_press", "dumbbell"),
  "barbell-bench-press": d("bench_press", "barbell"),
  "machine-chest-press": d("bench_press"),
  "dumbbell-shoulder-press": d("overhead_press", "dumbbell"),
  "overhead-press": d("overhead_press", "barbell"),
  "machine-shoulder-press": d("overhead_press"),
  "cable-tricep-pushdown": d("tricep_pushdown"),
  "overhead-tricep-extension": d("overhead_tri_ext", "dumbbell"),
  "skull-crusher": d("skull_crusher", "barbell"),
  "lateral-raise": d("lateral_raise", "dumbbell"),
  // pulling
  "barbell-row": d("row_bent", "barbell"),
  "one-arm-dumbbell-row": d("row_bent", "dumbbell"),
  "backpack-row": d("row_bent", "kettlebell"),
  "seated-cable-row": d("seated_row"),
  "lat-pulldown": d("lat_pulldown", "pullbar"),
  "pull-up": d("pull_up", "pullbar"),
  "chin-up": d("pull_up", "pullbar"),
  "hanging-leg-raise": d("hanging_leg_raise", "pullbar"),
  "dumbbell-bicep-curl": d("curl", "dumbbell"),
  "hammer-curl": d("curl", "dumbbell"),
  // cardio & standing
  "jumping-jacks": d("jumping_jack"),
  "high-knees": d("high_knees"),
  "farmer-carry": d("walk_carry", "dumbbell"),
  // floor work
  "bird-dog": d("bird_dog"),
  "donkey-kick": d("donkey_kick"),
  "dead-bug": d("dead_bug"),
  "flutter-kicks": d("flutter_kick"),
  "v-up": d("v_up"),
  "hollow-body-hold": d("hollow_hold"),
  superman: d("superman"),
  "leg-extension": d("seated_leg"),
  "leg-curl": d("seated_leg"),
  // yoga
  "downward-dog": d("dog"),
  "cobra-pose": d("sphinx"),
  "sphinx-pose": d("sphinx"),
  "boat-pose": d("boat"),
  "seated-forward-fold": d("fold_seated"),
  "mountain-pose": d("mountain"),
  "chair-pose": d("chair"),
  "tree-pose": d("tree"),
  "bridge-pose": d("bridge_static"),
};

export function demoFor(exerciseId: string): DemoSpec | undefined {
  return EXERCISE_DEMOS[exerciseId];
}
