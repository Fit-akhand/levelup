// Movement templates: each is a short loop of poses (see skeleton.ts for the angle convention).
// Many exercises share one template (push-up, wide push-up and diamond push-up all look the
// same from the side). The angles were worked out so hands and feet really touch the floor.
import type { Pose, Template } from "./skeleton.ts";

// p(torso, thigh, shin, upperArm, forearm, extras)
const p = (t: number, th: number, sh: number, a: number, f: number, x: Partial<Pose> = {}): Pose => ({
  t, th, sh, a, f, ...x,
});

type Opts = Partial<Omit<Template, "id" | "poses">>;
const side = (id: string, poses: Pose[], o: Opts = {}): Template => ({
  id, view: "side", anchor: "ankle", ground: true, poses, ...o,
});
const front = (id: string, poses: Pose[], o: Opts = {}): Template => ({
  id, view: "front", anchor: "hip", ground: true, poses, ...o,
});

// Reusable sub-poses ------------------------------------------------------------------
// Lying on your back, knees bent, feet flat (head to the left).
const LYING = { t: -90, th: 125, sh: 55 };
// On hands and knees (quadruped): arms vertical, thigh vertical, shins flat behind.
const QUAD = { t: 70, th: 0, sh: -90 };

const list: Template[] = [
  // ───────────── Squats ─────────────
  side("squat_bw", [p(0, 0, 0, 90, 90), p(35, 80, -20, 90, 90)]),
  side("squat_goblet", [p(0, 0, 0, 15, 105), p(35, 80, -20, 15, 105)]),
  side("squat_back", [p(0, 0, 0, -20, 170), p(40, 80, -20, -20, 170)]),
  side("wall_sit", [p(0, 90, 0, 0, 0)], { hold: true, staticProps: ["wall"] }),

  // ───────────── Hinges ─────────────
  side("hinge", [p(0, 0, 0, 0, 0), p(75, 25, -5, 0, 0)]),
  side("single_leg_hinge", [p(0, 0, 0, 0, 0), p(80, 15, 0, 0, 0, { th2: -100, sh2: -100 })]),
  side("kb_swing", [p(65, 25, -5, -15, -15), p(0, 0, 0, 90, 90)]),
  side("glute_bridge", [p(LYING.t, LYING.th, LYING.sh, 90, 90), p(-128, 95, 28, 90, 90)]),
  side("single_leg_bridge", [
    p(LYING.t, LYING.th, LYING.sh, 90, 90, { th2: 150, sh2: 150 }),
    p(-128, 95, 28, 90, 90, { th2: 105, sh2: 105 }),
  ]),
  side("bridge_static", [p(-128, 95, 28, 90, 90)], { hold: true }),

  // ───────────── Push-ups & planks ─────────────
  side("push_up", [p(64, -64, -64, 0, 0), p(79, -79, -79, -60, 67)]),
  side("knee_push_up", [p(51, -51, -120, 0, 0), p(74, -74, -120, -60, 67)], { anchor: "knee" }),
  side("incline_push_up", [p(49, -49, -49, 0, 0), p(66, -66, -66, -60, 67)], { staticProps: ["box_hands"] }),
  side("decline_push_up", [p(79, -79, -79, 0, 0), p(92, -92, -92, -60, 67)], { staticProps: ["box_feet"] }),
  side("pike_push_up", [p(106, -27, -27, 0, 0), p(152, -27, -27, -60, 67)]),
  side("plank", [p(77, -77, -77, 0, 90)], { hold: true }),
  side(
    "mountain_climber",
    [
      p(64, 60, -100, 0, 0, { th2: -64, sh2: -64 }),
      p(64, -64, -64, 0, 0, { th2: 60, sh2: -100 }),
    ],
    { anchor: "wrist" },
  ),

  // ───────────── Lunge ─────────────
  side("lunge", [p(0, 0, 0, 0, 0), p(0, 85, 0, 0, 0, { th2: -25, sh2: -100 })]),

  // ───────────── Pressing ─────────────
  side(
    "bench_press",
    [p(-90, LYING.th, LYING.sh, 180, 180), p(-90, LYING.th, LYING.sh, 75, 180)],
    { staticProps: ["bench"] },
  ),
  side("overhead_press", [p(0, 0, 0, 20, 170), p(0, 0, 0, 172, 176)]),
  side("tricep_pushdown", [p(10, 0, 0, 0, 100), p(10, 0, 0, 0, 5)]),
  side("overhead_tri_ext", [p(0, 0, 0, 175, -40), p(0, 0, 0, 175, 178)]),
  side(
    "skull_crusher",
    [p(-90, LYING.th, LYING.sh, 180, 180), p(-90, LYING.th, LYING.sh, 180, -70)],
    { staticProps: ["bench"] },
  ),
  front("lateral_raise", [
    p(0, 3, 3, 8, 8, { th2: -3, sh2: -3, a2: -8, f2: -8 }),
    p(0, 3, 3, 88, 88, { th2: -3, sh2: -3, a2: -88, f2: -88 }),
  ]),

  // ───────────── Pulling ─────────────
  side("row_bent", [p(70, 25, -5, 0, 0), p(70, 25, -5, -100, 0)]),
  side("seated_row", [p(5, 80, 95, 90, 90), p(-10, 80, 95, -40, 90)], { anchor: "hip" }),
  side("lat_pulldown", [p(-10, 90, 0, 170, 175), p(-10, 90, 0, -10, 175)], { anchor: "hip" }),
  side("pull_up", [p(0, 0, -15, 178, 180), p(0, 0, -15, 0, 180)], { anchor: "wrist", ground: false }),
  side("hanging_leg_raise", [p(0, 0, 0, 178, 180), p(0, 90, 90, 178, 180)], { anchor: "wrist", ground: false }),
  side("curl", [p(0, 0, 0, 0, 0), p(0, 0, 0, 0, 165)]),

  // ───────────── Cardio / standing ─────────────
  front("jumping_jack", [
    p(0, 5, 5, 12, 12, { th2: -5, sh2: -5, a2: -12, f2: -12 }),
    p(0, 22, 22, 155, 155, { th2: -22, sh2: -22, a2: -155, f2: -155 }),
  ]),
  side(
    "high_knees",
    [
      p(0, 90, 0, 45, 135, { th2: 0, sh2: 0, a2: -40, f2: 60 }),
      p(0, 0, 0, -40, 60, { th2: 90, sh2: 0, a2: 45, f2: 135 }),
    ],
    { anchor: "hip" },
  ),
  side(
    "walk_carry",
    [p(0, 20, 10, 0, 0, { th2: -20, sh2: -35 }), p(0, -20, -35, 0, 0, { th2: 20, sh2: 10 })],
    { anchor: "hip" },
  ),

  // ───────────── Floor work ─────────────
  side("bird_dog", [
    p(QUAD.t, QUAD.th, QUAD.sh, 0, 0),
    p(QUAD.t, QUAD.th, QUAD.sh, 90, 90, { th2: -90, sh2: -90, a2: 0, f2: 0 }),
  ], { anchor: "knee" }),
  side("donkey_kick", [
    p(QUAD.t, QUAD.th, QUAD.sh, 0, 0),
    p(QUAD.t, QUAD.th, QUAD.sh, 0, 0, { th2: -130, sh2: 180 }),
  ], { anchor: "knee" }),
  side("dead_bug", [
    p(-90, 180, 90, 180, 180),
    p(-90, 180, 90, 180, 180, { th2: 100, sh2: 100, a2: -90, f2: -90 }),
  ], { anchor: "hip" }),
  side("flutter_kick", [
    p(-90, 108, 108, 90, 90, { th2: 80, sh2: 80 }),
    p(-90, 80, 80, 90, 90, { th2: 108, sh2: 108 }),
  ], { anchor: "hip" }),
  side("v_up", [p(-90, 90, 90, -90, -90), p(-35, 125, 125, 100, 100)], { anchor: "hip" }),
  side("hollow_hold", [p(-68, 112, 112, -112, -112)], { anchor: "hip", hold: true }),
  side("superman", [p(90, -90, -90, 90, 90), p(75, -103, -103, 105, 105)], { anchor: "hip" }),
  side("seated_leg", [p(-8, 90, 0, 10, 10), p(-8, 90, 90, 10, 10)], { anchor: "hip" }),

  // ───────────── Yoga (held poses) ─────────────
  side("dog", [p(106, -27, -27, 0, 0)], { hold: true }),
  side("sphinx", [p(54, -90, -90, 0, 90)], { hold: true, anchor: "hip" }),
  side("boat", [p(-35, 125, 125, 90, 90)], { hold: true, anchor: "hip" }),
  side("fold_seated", [p(70, 90, 90, 70, 85)], { hold: true, anchor: "hip" }),
  front("mountain", [p(0, 3, 3, 170, 170, { th2: -3, sh2: -3, a2: -170, f2: -170 })], { hold: true }),
  side("chair", [p(35, 80, -20, 175, 175)], { hold: true }),
  front("tree", [p(0, 0, 0, 175, 175, { th2: -70, sh2: 80, a2: -175, f2: -175 })], { hold: true }),
];

export const TEMPLATES: Record<string, Template> = Object.fromEntries(list.map((t) => [t.id, t]));
