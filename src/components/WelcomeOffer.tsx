"use client";

import Link from "next/link";
import RedeemCoupon from "./RedeemCoupon";
import { SparkleIcon } from "./Icons";
import { paymentsEnabled } from "@/lib/features";
import { useCouponUsed, useEntitlement } from "@/lib/entitlement";

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

// The "free first month" card on the plan page. It has two faces:
//   - before the coupon is used: a box to enter the code
//   - while the free month is running: a short confirmation with the end date (so redeeming
//     visibly "worked" instead of the card just vanishing)
// After the free month ends, and for paying users, it disappears.
export default function WelcomeOffer() {
  const { status, entitlement } = useEntitlement();
  const used = useCouponUsed(); // undefined = loading, null = not used yet

  if (!paymentsEnabled() || status === "loading" || used === undefined) return null;

  if (status === "plus" && entitlement?.planId === "coupon") {
    return (
      <section className="card border-primary p-4" aria-label="Free month active">
        <p className="flex items-center gap-2 font-extrabold text-accent">
          <SparkleIcon size={20} /> Your free month of Plus is on
        </p>
        <p className="mt-1 text-sm text-muted">
          Meal plans are unlocked until {fmtDate(entitlement.expiresAt)}.{" "}
          <Link href="/diet" className="font-semibold text-accent underline underline-offset-4">
            Open my meal plan
          </Link>
        </p>
      </section>
    );
  }

  if (status !== "free" || used !== null) return null;

  return (
    <section className="card border-primary p-4" aria-label="Welcome offer">
      <p className="flex items-center gap-2 font-extrabold text-accent">
        <SparkleIcon size={20} /> Welcome gift: your first month of Plus is free
      </p>
      <p className="mb-3 mt-1 text-sm text-muted">
        Just starting your fitness journey? Enter your coupon code to add a meal plan that fits you to your workouts for a month. Workouts are always free.{" "}
        <Link href="/pricing" className="font-semibold text-accent underline underline-offset-4">
          See Plus
        </Link>
      </p>
      <RedeemCoupon />
    </section>
  );
}
