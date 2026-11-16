import { Suspense } from "react";
import WorkoutPlayer from "@/components/WorkoutPlayer";

export const metadata = { title: "Workout · Level Up" };

// A folder named [day] is a "dynamic segment": one page that serves /workout/1, /workout/2, ...
// generateStaticParams tells Next.js to build those pages ahead of time.
export function generateStaticParams() {
  return [1, 2, 3, 4, 5, 6].map((day) => ({ day: String(day) }));
}

export default function WorkoutPage() {
  // Suspense lets Next.js show the fallback while the browser-only player loads.
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Loading…</div>}>
      <WorkoutPlayer />
    </Suspense>
  );
}
