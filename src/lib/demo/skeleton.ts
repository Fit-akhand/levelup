// A tiny stick-figure engine. A "pose" is just a handful of ANGLES; this file turns angles into
// joint positions (forward kinematics) and fits a whole animation into the drawing box.
//
// Angle convention (degrees), everything is ABSOLUTE, not relative to the parent bone:
//   limbs (thigh, shin, upper arm, forearm): measured from "straight down".
//        0 = pointing down, 90 = pointing forward (+x), 180 = pointing up, -90 = pointing backward.
//   torso: measured from "straight up".  0 = upright, 90 = leaning forward flat, -90 = flat backward.
// Using absolute angles keeps authoring simple: "forearm 180" always means "pointing up".

export type Pt = [number, number];

export interface Pose {
  t: number; // torso
  th: number; // leg 1: thigh
  sh: number; // leg 1: shin
  a: number; // arm 1: upper arm
  f: number; // arm 1: forearm
  // Leg 2 / arm 2 default to the same as leg 1 / arm 1 (they overlap in a side view).
  th2?: number;
  sh2?: number;
  a2?: number;
  f2?: number;
  hd?: number; // head direction (defaults to the torso direction)
}

export type Anchor = "ankle" | "knee" | "hip" | "wrist";
export type Prop =
  | "dumbbell"
  | "barbell"
  | "kettlebell"
  | "bar_back"
  | "pullbar"
  | "box_hands"
  | "box_feet"
  | "wall"
  | "bench";

export interface Template {
  id: string;
  view: "side" | "front";
  anchor: Anchor; // the joint that stays planted (feet on the floor, hands on the bar...)
  ground: boolean; // draw a floor line?
  hold?: boolean; // a static position held for time (one pose, no animation)
  poses: Pose[]; // the animation loops pose 0 -> 1 -> ... -> 0
  staticProps?: Prop[]; // fixed objects drawn once (wall, bench, box)
}

export interface Skeleton {
  hip: Pt;
  shoulder: Pt;
  head: Pt;
  elbow1: Pt;
  wrist1: Pt;
  elbow2: Pt;
  wrist2: Pt;
  knee1: Pt;
  ankle1: Pt;
  knee2: Pt;
  ankle2: Pt;
}

// Bone lengths (drawing units).
export const BONE = { torso: 36, thigh: 28, shin: 28, upper: 21, fore: 19, neck: 14 } as const;
export const HEAD_R = 8;
export const VIEW_W = 160;
export const VIEW_H = 130;

const rad = (deg: number) => (deg * Math.PI) / 180;
const down = (deg: number): Pt => [Math.sin(rad(deg)), Math.cos(rad(deg))]; // limb direction (y grows downward)
const up = (deg: number): Pt => [Math.sin(rad(deg)), -Math.cos(rad(deg))]; // torso direction
const add = (p: Pt, d: Pt, len: number): Pt => [p[0] + d[0] * len, p[1] + d[1] * len];

export function forwardKinematics(p: Pose): Skeleton {
  const hip: Pt = [0, 0];
  const shoulder = add(hip, up(p.t), BONE.torso);
  const head = add(shoulder, up(p.hd ?? p.t), BONE.neck);

  const elbow1 = add(shoulder, down(p.a), BONE.upper);
  const wrist1 = add(elbow1, down(p.f), BONE.fore);
  const elbow2 = add(shoulder, down(p.a2 ?? p.a), BONE.upper);
  const wrist2 = add(elbow2, down(p.f2 ?? p.f), BONE.fore);

  const knee1 = add(hip, down(p.th), BONE.thigh);
  const ankle1 = add(knee1, down(p.sh), BONE.shin);
  const knee2 = add(hip, down(p.th2 ?? p.th), BONE.thigh);
  const ankle2 = add(knee2, down(p.sh2 ?? p.sh), BONE.shin);

  return { hip, shoulder, head, elbow1, wrist1, elbow2, wrist2, knee1, ankle1, knee2, ankle2 };
}

const ANCHOR_KEY = { ankle: "ankle1", knee: "knee1", hip: "hip", wrist: "wrist1" } as const;

function mapPoints(s: Skeleton, fn: (p: Pt) => Pt): Skeleton {
  return {
    hip: fn(s.hip),
    shoulder: fn(s.shoulder),
    head: fn(s.head),
    elbow1: fn(s.elbow1),
    wrist1: fn(s.wrist1),
    elbow2: fn(s.elbow2),
    wrist2: fn(s.wrist2),
    knee1: fn(s.knee1),
    ankle1: fn(s.ankle1),
    knee2: fn(s.knee2),
    ankle2: fn(s.ankle2),
  };
}

export interface Layout {
  frames: Skeleton[]; // one per pose, already placed inside the VIEW_W x VIEW_H box
  headR: number;
  groundY: number | null;
  scale: number;
}

// Turns a template into drawable frames:
//  1. keep the anchor joint planted across all frames (feet don't slide)
//  2. find the box that contains every frame
//  3. scale + centre it to fit the drawing area
export function layoutTemplate(t: Template): Layout {
  const raw = t.poses.map(forwardKinematics);
  const key = ANCHOR_KEY[t.anchor];
  const base = raw[0][key];
  const planted = raw.map((s) => {
    const dx = base[0] - s[key][0];
    const dy = base[1] - s[key][1];
    return mapPoints(s, (p) => [p[0] + dx, p[1] + dy]);
  });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of planted) {
    for (const [name, p] of Object.entries(s) as [keyof Skeleton, Pt][]) {
      const r = name === "head" ? HEAD_R : 0;
      minX = Math.min(minX, p[0] - r);
      maxX = Math.max(maxX, p[0] + r);
      minY = Math.min(minY, p[1] - r);
      maxY = Math.max(maxY, p[1] + r);
    }
  }
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const scale = Math.min(1.4, (VIEW_W - 28) / w, (VIEW_H - 34) / h);

  const floorY = VIEW_H - 16;
  const offX = (VIEW_W - w * scale) / 2 - minX * scale;
  const offY = t.ground ? floorY - maxY * scale : (VIEW_H - h * scale) / 2 - minY * scale;

  // Round to 1 decimal. Math.sin/cos can differ in the last digits between the server and the
  // browser, which would make React report a hydration mismatch; rounding makes both identical.
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const frames = planted.map((s) => mapPoints(s, (p) => [r1(p[0] * scale + offX), r1(p[1] * scale + offY)]));
  return { frames, headR: r1(HEAD_R * scale), groundY: t.ground ? floorY : null, scale };
}
