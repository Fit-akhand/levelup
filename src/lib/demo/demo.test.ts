import { test } from "node:test";
import assert from "node:assert/strict";
import { BONE, VIEW_H, VIEW_W, forwardKinematics, layoutTemplate } from "./skeleton.ts";
import { TEMPLATES } from "./templates.ts";
import { EXERCISE_DEMOS } from "./exerciseDemos.ts";
import { library } from "../../data/library.ts";

test("forward kinematics: standing pose has legs straight down and torso straight up", () => {
  const s = forwardKinematics({ t: 0, th: 0, sh: 0, a: 0, f: 0 });
  assert.deepEqual(s.hip, [0, 0]);
  assert.ok(Math.abs(s.ankle1[1] - (BONE.thigh + BONE.shin)) < 1e-9, "ankle is leg-length below the hip");
  assert.ok(Math.abs(s.ankle1[0]) < 1e-9);
  assert.ok(Math.abs(s.shoulder[1] + BONE.torso) < 1e-9, "shoulder is torso-length above the hip");
});

test("forward kinematics: angle 90 points forward (+x)", () => {
  const s = forwardKinematics({ t: 0, th: 90, sh: 90, a: 90, f: 90 });
  assert.ok(Math.abs(s.knee1[0] - BONE.thigh) < 1e-9 && Math.abs(s.knee1[1]) < 1e-9);
  assert.ok(Math.abs(s.wrist1[0] - (BONE.upper + BONE.fore)) < 1e-9);
});

test("bone lengths are preserved in every pose of every template", () => {
  for (const t of Object.values(TEMPLATES)) {
    for (const pose of t.poses) {
      const s = forwardKinematics(pose);
      const d = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      assert.ok(Math.abs(d(s.hip, s.knee1) - BONE.thigh) < 1e-9, `${t.id}: thigh`);
      assert.ok(Math.abs(d(s.elbow1, s.wrist1) - BONE.fore) < 1e-9, `${t.id}: forearm`);
      assert.ok(Math.abs(d(s.hip, s.shoulder) - BONE.torso) < 1e-9, `${t.id}: torso`);
    }
  }
});

test("every template fits inside the drawing box in every frame", () => {
  for (const t of Object.values(TEMPLATES)) {
    const { frames, headR } = layoutTemplate(t);
    for (const s of frames) {
      for (const [name, p] of Object.entries(s)) {
        const r = name === "head" ? headR : 0;
        assert.ok(p[0] - r >= -0.5 && p[0] + r <= VIEW_W + 0.5, `${t.id}: ${name} x=${p[0]} outside`);
        assert.ok(p[1] - r >= -0.5 && p[1] + r <= VIEW_H + 0.5, `${t.id}: ${name} y=${p[1]} outside`);
      }
    }
  }
});

test("the anchor joint stays planted across frames (feet do not slide)", () => {
  const keys = { ankle: "ankle1", knee: "knee1", hip: "hip", wrist: "wrist1" } as const;
  for (const t of Object.values(TEMPLATES)) {
    const { frames } = layoutTemplate(t);
    const k = keys[t.anchor];
    for (const s of frames) {
      assert.ok(Math.abs(s[k][0] - frames[0][k][0]) < 0.3, `${t.id}: anchor x moved`);
      assert.ok(Math.abs(s[k][1] - frames[0][k][1]) < 0.3, `${t.id}: anchor y moved`);
    }
  }
});

test("layout is rounded to 1 decimal so server and browser render identically", () => {
  for (const t of Object.values(TEMPLATES)) {
    for (const s of layoutTemplate(t).frames)
      for (const p of Object.values(s))
        for (const v of p) assert.equal(Math.round(v * 10) / 10, v, `${t.id}: ${v} not rounded`);
  }
});

test("hold templates have one pose; moving templates have at least two", () => {
  for (const t of Object.values(TEMPLATES)) {
    if (t.hold) assert.equal(t.poses.length, 1, `${t.id} is a hold`);
    else assert.ok(t.poses.length >= 2, `${t.id} needs 2+ poses to animate`);
  }
});

test("every demo mapping points at a real exercise and a real template", () => {
  const ids = new Set(library.map((e) => e.id));
  for (const [exId, spec] of Object.entries(EXERCISE_DEMOS)) {
    assert.ok(ids.has(exId), `unknown exercise "${exId}"`);
    assert.ok(TEMPLATES[spec.template], `exercise "${exId}" uses missing template "${spec.template}"`);
  }
});

test("every template is used by at least one exercise (no dead templates)", () => {
  const used = new Set(Object.values(EXERCISE_DEMOS).map((s) => s.template));
  for (const id of Object.keys(TEMPLATES)) assert.ok(used.has(id), `template "${id}" is unused`);
});
