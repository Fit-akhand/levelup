"use client";
// Draws an exercise demo as an animated stick figure (pure SVG, no images, no video).
//
// The animation uses SVG's built-in <animate> (SMIL): we give each limb a list of shapes, one per
// pose, and the browser smoothly morphs between them. No JavaScript runs per frame, so it is
// cheap even with many demos on screen, and it renders on the server too.

import { useMemo, useSyncExternalStore } from "react";
import { demoFor } from "@/lib/demo/exerciseDemos";
import { TEMPLATES } from "@/lib/demo/templates";
import { VIEW_H, VIEW_W, layoutTemplate, type Layout, type Prop, type Pt, type Skeleton } from "@/lib/demo/skeleton";

const layoutCache = new Map<string, Layout>();
function layoutFor(id: string): Layout {
  let l = layoutCache.get(id);
  if (!l) {
    l = layoutTemplate(TEMPLATES[id]);
    layoutCache.set(id, l);
  }
  return l;
}

const f = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
const chain = (a: Pt, b: Pt, c?: Pt) => `M${f(a)} L${f(b)}${c ? ` L${f(c)}` : ""}`;

// People who ask their device to reduce motion get a still picture instead.
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

interface Timing {
  dur: string;
  keyTimes: string;
  keySplines: string;
}

// <animate> that morphs `attr` through `values` and loops forever, easing in and out.
function Anim({ attr, values, timing }: { attr: string; values: string[]; timing: Timing }) {
  return (
    <animate
      attributeName={attr}
      values={values.join(";")}
      keyTimes={timing.keyTimes}
      keySplines={timing.keySplines}
      calcMode="spline"
      dur={timing.dur}
      repeatCount="indefinite"
    />
  );
}

interface LimbProps {
  frames: Skeleton[]; // already looped (first frame repeated at the end when animated)
  pick: (s: Skeleton) => string;
  timing: Timing | null;
  stroke: string;
  width: number;
  opacity?: number;
}

function Limb({ frames, pick, timing, stroke, width, opacity }: LimbProps) {
  const values = frames.map(pick);
  return (
    <path
      d={values[0]}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    >
      {timing && <Anim attr="d" values={values} timing={timing} />}
    </path>
  );
}

interface DotProps {
  frames: Skeleton[];
  pick: (s: Skeleton) => Pt;
  timing: Timing | null;
  r: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

function Dot({ frames, pick, timing, r, fill = "none", stroke, strokeWidth }: DotProps) {
  const pts = frames.map(pick);
  return (
    <circle cx={pts[0][0]} cy={pts[0][1]} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth}>
      {timing && <Anim attr="cx" values={pts.map((p) => p[0].toFixed(1))} timing={timing} />}
      {timing && <Anim attr="cy" values={pts.map((p) => p[1].toFixed(1))} timing={timing} />}
    </circle>
  );
}

const FG = "var(--foreground)";
const ACCENT = "var(--accent-text)";
const SOFT = "var(--line)";

interface DemoProps {
  exerciseId: string;
  name: string;
  caption?: boolean;
  frameIndex?: number; // show one fixed pose instead of animating (used for checking poses)
}

export default function ExerciseDemo({ exerciseId, name, caption = true, frameIndex }: DemoProps) {
  const reduced = useReducedMotion();
  const spec = demoFor(exerciseId);
  const template = spec ? TEMPLATES[spec.template] : undefined;
  const layout = useMemo(() => (template ? layoutFor(template.id) : undefined), [template]);

  if (!spec || !template || !layout) return null;

  const { frames, groundY, headR } = layout;
  const fixed = frameIndex !== undefined;
  const animated = !fixed && !reduced && !template.hold && frames.length > 1;
  const loop = animated ? [...frames, frames[0]] : [frames[fixed ? Math.min(frameIndex, frames.length - 1) : 0]];
  const timing: Timing | null = animated
    ? {
        dur: `${frames.length * 1.3}s`,
        keyTimes: loop.map((_, i) => (i / (loop.length - 1)).toFixed(3)).join(";"),
        keySplines: Array(loop.length - 1).fill("0.45 0 0.55 1").join(";"),
      }
    : null;

  const f0 = frames[0];
  const isFront = template.view === "front";
  const farOpacity = isFront ? 1 : 0.45; // in a side view the far-side limbs are drawn fainter
  const prop: Prop | undefined = spec.prop;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`${animated ? "Animated demo" : "Position"}: ${name}`}
        className="h-auto w-full rounded-2xl bg-tint"
      >
        {groundY !== null && <line x1={8} x2={VIEW_W - 8} y1={groundY} y2={groundY} stroke={SOFT} strokeWidth={2} strokeLinecap="round" />}

        {/* Fixed objects: wall, bench, boxes */}
        {template.staticProps?.includes("wall") && (
          <line x1={f0.hip[0] - 11} x2={f0.hip[0] - 11} y1={f0.head[1] - 12} y2={groundY ?? VIEW_H - 16} stroke={SOFT} strokeWidth={4} strokeLinecap="round" />
        )}
        {template.staticProps?.includes("bench") && (
          <rect x={f0.shoulder[0] - 16} y={f0.hip[1] + 3} width={f0.hip[0] - f0.shoulder[0] + 28} height={6} rx={3} fill={SOFT} />
        )}
        {template.staticProps?.includes("box_hands") && groundY !== null && (
          <rect x={f0.wrist1[0] - 14} y={f0.wrist1[1] + 2} width={28} height={Math.max(groundY - f0.wrist1[1] - 2, 4)} rx={3} fill={SOFT} />
        )}
        {template.staticProps?.includes("box_feet") && groundY !== null && (
          <rect x={f0.ankle1[0] - 16} y={f0.ankle1[1] + 2} width={26} height={Math.max(groundY - f0.ankle1[1] - 2, 4)} rx={3} fill={SOFT} />
        )}

        {/* Far-side limbs first so near-side limbs draw on top */}
        {!isFront && <Limb frames={loop} pick={(s) => chain(s.hip, s.knee2, s.ankle2)} timing={timing} stroke={ACCENT} width={5} opacity={farOpacity} />}
        {!isFront && <Limb frames={loop} pick={(s) => chain(s.shoulder, s.elbow2, s.wrist2)} timing={timing} stroke={ACCENT} width={5} opacity={farOpacity} />}
        {isFront && <Limb frames={loop} pick={(s) => chain(s.hip, s.knee2, s.ankle2)} timing={timing} stroke={ACCENT} width={5} />}
        {isFront && <Limb frames={loop} pick={(s) => chain(s.shoulder, s.elbow2, s.wrist2)} timing={timing} stroke={ACCENT} width={5} />}

        <Limb frames={loop} pick={(s) => chain(s.hip, s.knee1, s.ankle1)} timing={timing} stroke={ACCENT} width={5} />
        <Limb frames={loop} pick={(s) => chain(s.hip, s.shoulder)} timing={timing} stroke={FG} width={6} />
        <Limb frames={loop} pick={(s) => chain(s.shoulder, s.elbow1, s.wrist1)} timing={timing} stroke={ACCENT} width={5} />
        <Dot frames={loop} pick={(s) => s.head} timing={timing} r={headR} fill="var(--surface)" stroke={FG} strokeWidth={3.5} />

        {/* Held objects */}
        {prop === "dumbbell" && (
          <>
            <Dot frames={loop} pick={(s) => s.wrist1} timing={timing} r={5} fill={FG} />
            {isFront && <Dot frames={loop} pick={(s) => s.wrist2} timing={timing} r={5} fill={FG} />}
          </>
        )}
        {prop === "barbell" && <Dot frames={loop} pick={(s) => s.wrist1} timing={timing} r={8} stroke={FG} strokeWidth={3} />}
        {prop === "kettlebell" && <Dot frames={loop} pick={(s) => s.wrist1} timing={timing} r={7} fill={FG} />}
        {prop === "pullbar" && <Dot frames={loop} pick={(s) => s.wrist1} timing={timing} r={3.5} fill={FG} />}
        {prop === "bar_back" && <Dot frames={loop} pick={(s) => s.shoulder} timing={timing} r={6} fill={FG} />}
      </svg>
      {caption && (
        <figcaption className="mt-1 text-center text-xs text-muted">
          {template.hold ? "Hold this position" : "Move slowly and smoothly"}
        </figcaption>
      )}
    </figure>
  );
}
