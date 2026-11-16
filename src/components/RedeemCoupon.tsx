"use client";

import { useState } from "react";
import { markCouponUsed, saveToken } from "@/lib/entitlement";

const ERRORS: Record<string, string> = {
  invalid_coupon: "That coupon code is not valid.",
  coupons_not_available: "Coupons are not available right now. Please try again later.",
  bad_request: "Please type your coupon code.",
};

// A box to type a coupon code. On success the server returns a signed Plus pass, which we save.
export default function RedeemCoupon() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function redeem(e: React.FormEvent) {
    e.preventDefault(); // stay on the page; we handle the form ourselves
    setMessage(null);
    if (!code.trim()) return setMessage({ kind: "error", text: ERRORS.bad_request });
    setBusy(true);
    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) return setMessage({ kind: "error", text: ERRORS[data.error] ?? "Something went wrong. Please try again." });
      if (!saveToken(data.token)) {
        return setMessage({ kind: "error", text: "Your browser is blocking storage, so we could not save your free month." });
      }
      markCouponUsed(code.trim().toUpperCase());
      setMessage({
        kind: "ok",
        text: `Coupon applied! Level Up Plus is free until ${new Date(data.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`,
      });
      setCode("");
    } catch {
      setMessage({ kind: "error", text: "We could not reach the server. Check your internet and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={redeem}>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Coupon code"
          aria-label="Coupon code"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface px-4 py-3 uppercase outline-none placeholder:normal-case focus:border-primary"
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "..." : "Apply"}
        </button>
      </div>
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={[
            "mt-3 rounded-xl px-4 py-3 text-sm font-semibold",
            message.kind === "ok" ? "bg-tint text-accent" : "bg-red-500/10 text-red-600 dark:text-red-400",
          ].join(" ")}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
