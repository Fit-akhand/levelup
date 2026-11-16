"use client";

import { useState } from "react";
import { CheckIcon, SparkleIcon } from "./Icons";
import { PLANS, FREE_FEATURES, PLUS_FEATURES, formatRupees, type PlanId } from "@/lib/payments/plans";
import { verifyToken } from "@/lib/payments/token";
import { publicKey, saveToken, useEntitlement } from "@/lib/entitlement";

// Razorpay's checkout script adds this to the page. We only declare the parts we use.
interface RazorpayResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const ERRORS: Record<string, string> = {
  payments_not_configured: "Payments are not switched on yet. Please check back soon.",
  gateway_error: "We could not reach the payment service. You have not been charged. Please try again.",
  invalid_payment: "We could not confirm that payment. If money was taken, it will be refunded by your bank or Razorpay.",
};

export default function Pricing() {
  const { status, entitlement, token } = useEntitlement();
  const [planId, setPlanId] = useState<PlanId>("plus_quarter");
  const [adult, setAdult] = useState(false); // "I am 18+, or a parent/guardian paying"
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const plan = PLANS.find((p) => p.id === planId)!;

  // After the browser has a payment id and signature, our server checks them with Razorpay and returns a pass.
  async function verifyAndSave(orderId: string, paymentId: string, signature: string, testMode: boolean) {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, paymentId, signature }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(ERRORS[data.error] ?? "Something went wrong. You have not been charged.");
    if (!saveToken(data.token)) throw new Error("Paid, but your browser blocked saving the pass. Copy your code from this page.");
    setMessage({
      kind: "ok",
      text: testMode ? "Test mode: Plus is on. No real payment was taken." : "Payment received. Level Up Plus is on. Thank you!",
    });
  }

  async function pay() {
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }), // only the plan id: the server decides the price
      });
      const order = await res.json();
      if (!res.ok) throw new Error(ERRORS[order.error] ?? "Something went wrong. You have not been charged.");

      if (order.mode === "mock") {
        // Development only: the server confirmed there is no real gateway, so simulate a payment.
        await verifyAndSave(order.orderId, "pay_mock_" + Date.now().toString(36), "mock", true);
        return;
      }

      if (!(await loadRazorpayScript()) || !window.Razorpay) throw new Error("Could not load the payment window. Check your internet and try again.");
      await new Promise<void>((resolve, reject) => {
        const checkout = new window.Razorpay!({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: "Level Up",
          description: `Level Up Plus: ${order.planName}`,
          theme: { color: "#10b981" },
          // No name, email or phone is sent from here: Razorpay asks the payer itself.
          handler: (r: RazorpayResult) => {
            verifyAndSave(r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature, false).then(resolve, reject);
          },
          modal: { ondismiss: () => resolve() }, // closed the window without paying
        });
        checkout.open();
      });
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setMessage(null);
    const key = publicKey();
    const clean = code.trim();
    if (!key || !clean || !(await verifyToken(clean, key))) {
      return setMessage({ kind: "error", text: "That code is not valid, or it has expired." });
    }
    saveToken(clean);
    setCode("");
    setMessage({ kind: "ok", text: "Restored. Level Up Plus is on." });
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(token ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the code is still visible to copy by hand */
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        Level Up <span className="text-accent">Plus</span> <SparkleIcon size={28} />
      </h1>
      <p className="mt-1 text-muted">Workouts stay free forever. Plus adds your personal meal plans for less than the price of a chai.</p>

      {status === "plus" && entitlement && (
        <section className="card mt-5 border-primary p-4" aria-label="Your Plus pass">
          <p className="font-bold text-accent">You have Level Up Plus</p>
          <p className="text-sm text-muted">
            Valid until {new Date(entitlement.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold">Your restore code (save it)</summary>
            <p className="mt-2 text-muted">
              Plus lives on this device. If you clear your browser data or switch phones, paste this code on this page to get it back.
            </p>
            <textarea readOnly value={token ?? ""} rows={3} className="mt-2 w-full rounded-xl border-2 border-line bg-surface p-2 font-mono text-xs" />
            <button className="btn btn-ghost btn-sm mt-2" onClick={copyCode}>
              {copied ? "Copied" : "Copy code"}
            </button>
          </details>
        </section>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="card p-4">
          <h2 className="text-lg font-bold">Free</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-accent"><CheckIcon size={16} /></span>
                {f}
              </li>
            ))}
          </ul>
        </section>
        <section className="card border-primary p-4">
          <h2 className="text-lg font-bold text-accent">Plus</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {PLUS_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-accent"><CheckIcon size={16} /></span>
                {f}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <h2 className="mt-8 text-xl font-extrabold tracking-tight">{status === "plus" ? "Extend your pass" : "Choose a pass"}</h2>
      <div role="radiogroup" aria-label="Choose a pass" className="mt-3 space-y-2">
        {PLANS.map((p) => {
          const selected = p.id === planId;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPlanId(p.id)}
              className={[
                "flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition active:scale-[0.99]",
                selected ? "border-primary bg-tint" : "border-line bg-surface hover:border-primary/60",
              ].join(" ")}
            >
              <span>
                <span className="block font-bold">
                  {p.name}
                  {p.id === "plus_year" && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-extrabold text-on-primary">Best value</span>}
                </span>
                <span className="block text-sm text-muted">about ₹{((p.pricePaise / 100 / p.days) * 30).toFixed(0)} a month</span>
              </span>
              <span className="text-xl font-extrabold">{formatRupees(p.pricePaise)}</span>
            </button>
          );
        })}
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--primary)]" />
        <span>
          I am <b>18 or older</b>, or I am a <b>parent or guardian</b> paying for a teen.
        </span>
      </label>

      <button className="btn btn-primary mt-4 w-full text-lg" disabled={!adult || busy} onClick={pay}>
        {busy ? "Please wait..." : `Pay ${formatRupees(plan.pricePaise)}`}
      </button>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={[
            "mt-4 rounded-xl px-4 py-3 text-sm font-semibold",
            message.kind === "ok" ? "bg-tint text-accent" : "bg-red-500/10 text-red-600 dark:text-red-400",
          ].join(" ")}
        >
          {message.text}
        </p>
      )}

      <ul className="mt-5 space-y-1 text-xs text-muted">
        <li>One-time payment. Your pass ends on its own and never renews automatically.</li>
        <li>You pay on Razorpay with UPI, card or net banking. We never see your card or UPI details.</li>
        <li>Under 18? Please ask a parent or guardian to buy the pass for you.</li>
      </ul>

      <details className="card mt-6 p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Already paid? Restore with your code</summary>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your restore code"
            aria-label="Restore code"
            className="min-w-0 flex-1 rounded-xl border-2 border-line bg-surface px-3 py-2 outline-none focus:border-primary"
          />
          <button className="btn btn-ghost btn-sm" onClick={restore}>
            Restore
          </button>
        </div>
      </details>
    </div>
  );
}
