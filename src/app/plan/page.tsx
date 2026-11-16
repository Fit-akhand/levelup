"use client";

import Link from "next/link";
import PlanView from "@/components/PlanView";
import { LogoMark } from "@/components/Logo";
import { useProfile } from "@/lib/storage";

export default function PlanPage() {
  const profile = useProfile(); // undefined = loading, null = no profile saved

  if (profile === undefined) {
    // A simple skeleton so the page does not jump when the plan appears.
    return (
      <div className="mx-auto w-full max-w-2xl animate-pulse space-y-4 px-5 py-8" aria-busy="true" aria-label="Loading your plan">
        <div className="h-4 w-20 rounded bg-line" />
        <div className="h-9 w-48 rounded bg-line" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 rounded-2xl bg-line" />
          <div className="h-20 rounded-2xl bg-line" />
          <div className="h-20 rounded-2xl bg-line" />
        </div>
        <div className="h-56 rounded-2xl bg-line" />
      </div>
    );
  }

  if (profile === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <LogoMark size={56} />
        <h1 className="text-2xl font-extrabold tracking-tight">No plan yet</h1>
        <p className="max-w-sm text-muted">Answer a few quick questions and we will build your plan.</p>
        <Link href="/onboarding" className="btn btn-primary px-10">
          Get started
        </Link>
      </main>
    );
  }

  return <PlanView profile={profile} />;
}
