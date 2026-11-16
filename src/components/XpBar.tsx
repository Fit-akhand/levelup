import type { LevelInfo } from "@/lib/gamification";

// Shows "Lv 3 · Grinder" with a progress bar toward the next level.
export default function XpBar({ info }: { info: LevelInfo }) {
  const pct = Math.round(info.progress * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-extrabold">
          Level {info.level} <span className="font-semibold text-accent">· {info.title}</span>
        </p>
        <p className="text-xs font-medium text-muted">
          {info.xpIntoLevel} / {info.xpForNext} XP
        </p>
      </div>
      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="XP progress to next level"
      >
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
