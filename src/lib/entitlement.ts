// "Does this person have Level Up Plus right now?"
// The pass (a signed token from our server) is kept in the browser. Every time it is read we CHECK
// its signature with the public key, so a hand-edited pass is ignored. Passes also expire.
import { useEffect, useState } from "react";
import { createLocalStore } from "./localStore";
import { verifyToken, type Entitlement } from "./payments/token";

function parseToken(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

const store = createLocalStore<string>("levelup.entitlement.v1", parseToken);
export const saveToken = store.save;
export const clearToken = store.clear;

// Remembers that this device has already claimed its free month (even after the pass expires).
// It is only a per-device memory: someone who clears their browser data could claim again, which
// is the limit of an app without accounts (see PAYMENTS.md).
const couponStore = createLocalStore<string>("levelup.coupon.v1", parseToken);
export const useCouponUsed = couponStore.useValue; // undefined = loading, null = not used yet, string = the code used
export const markCouponUsed = couponStore.save;

// The PUBLIC key is safe to ship in the app (it can only check passes, never make them).
export function publicKey(): JsonWebKey | null {
  try {
    const raw = process.env.NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY_JWK; // must be written exactly like this for Next.js to inline it
    return raw ? (JSON.parse(raw) as JsonWebKey) : null;
  } catch {
    return null;
  }
}

export interface EntitlementState {
  status: "loading" | "free" | "plus";
  entitlement: Entitlement | null;
  token: string | null;
}

export function useEntitlement(): EntitlementState {
  const raw = store.useValue(); // undefined = still reading the device, null = no pass saved
  const [checked, setChecked] = useState<{ raw: string; entitlement: Entitlement | null } | null>(null);

  useEffect(() => {
    if (!raw) return;
    const key = publicKey();
    let cancelled = false;
    // Checking a signature is asynchronous, so the result arrives later via setState (not during render).
    (key ? verifyToken(raw, key) : Promise.resolve(null)).then((entitlement) => {
      if (!cancelled) setChecked({ raw, entitlement });
    });
    return () => {
      cancelled = true;
    };
  }, [raw]);

  if (raw === undefined) return { status: "loading", entitlement: null, token: null };
  if (raw === null) return { status: "free", entitlement: null, token: null };
  if (checked?.raw !== raw) return { status: "loading", entitlement: null, token: raw };
  return checked.entitlement
    ? { status: "plus", entitlement: checked.entitlement, token: raw }
    : { status: "free", entitlement: null, token: raw };
}
