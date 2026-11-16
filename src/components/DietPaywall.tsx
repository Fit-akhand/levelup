import Link from "next/link";
import { LockIcon } from "./Icons";
import { PLANS, PLUS_FEATURES, formatRupees } from "@/lib/payments/plans";

// Shown instead of the meal plan to people without Plus.
export default function DietPaywall({ teen }: { teen: boolean }) {
  const cheapest = PLANS[0];
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-5 py-12 text-center animate-rise">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-tint text-accent">
        <LockIcon size={28} />
      </span>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Meal plans are in Plus</h1>
      <p className="mt-2 text-muted">
        Your workouts are free forever. Plus adds a personal 7-day Indian meal plan built around your food, budget and allergies.
      </p>
      <ul className="card mt-6 w-full space-y-2 p-4 text-left text-sm">
        {PLUS_FEATURES.map((f) => (
          <li key={f}>• {f}</li>
        ))}
      </ul>
      <Link href="/pricing" className="btn btn-primary mt-6 w-full">
        See Plus from {formatRupees(cheapest.pricePaise)}
      </Link>
      {teen && <p className="mt-3 text-sm text-muted">Under 18? Ask a parent or guardian to buy it for you.</p>}
    </main>
  );
}
