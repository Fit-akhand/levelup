"use client";

import Link from "next/link";
import DietPaywall from "@/components/DietPaywall";
import DietSetup from "@/components/DietSetup";
import DietView from "@/components/DietView";
import { LogoMark } from "@/components/Logo";
import { useEntitlement } from "@/lib/entitlement";
import { useProfile } from "@/lib/storage";

export default function DietPage() {
  const profile = useProfile(); // undefined = loading, null = no profile saved
  const { status } = useEntitlement(); // "loading" | "free" | "plus"

  if (profile === undefined || status === "loading") {
    return <div className="p-8 text-center text-muted">Loading…</div>;
  }

  if (profile === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <LogoMark size={56} />
        <h1 className="text-2xl font-extrabold tracking-tight">No meal plan yet</h1>
        <p className="max-w-sm text-muted">Answer a few quick questions and we will build your workout and meal plan.</p>
        <Link href="/onboarding" className="btn btn-primary px-10">
          Get started
        </Link>
      </main>
    );
  }

  // Meal plans are a Plus feature. (The workout side of the app stays free.)
  if (status !== "plus") return <DietPaywall teen={profile.age < 18} />;

  // Profiles made before food questions existed have no preferences yet: ask now.
  if (!profile.diet || !profile.budget) return <DietSetup profile={profile} />;

  return <DietView profile={profile} />;
}
