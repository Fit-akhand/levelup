// A "Plus pass" is a small signed message from our server: "payment pay_123 bought plan X,
// valid until date Y". The server signs it with a PRIVATE key that never leaves the server; the app
// checks it with the matching PUBLIC key. Anyone can read a pass, but nobody can make or change
// one without the private key. That is why editing localStorage cannot grant a fake Plus.
//
// Uses WebCrypto (ECDSA P-256), which exists in Node and in every modern browser, so the very same
// code signs on the server and verifies in the browser.
import type { PlanId } from "./plans.ts";

// A pass comes from buying a plan, or from redeeming a free coupon.
export type PassKind = PlanId | "coupon";

export interface Entitlement {
  v: 1;
  planId: PassKind;
  paymentId: string;
  issuedAt: number; // ms since 1970
  expiresAt: number;
}

const ALG = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIGN = { name: "ECDSA", hash: "SHA-256" } as const;
const encoder = new TextEncoder();

function toB64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(text: string): Uint8Array<ArrayBuffer> {
  const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Server only: sign a pass.
export async function signToken(payload: Entitlement, privateJwk: JsonWebKey): Promise<string> {
  const key = await crypto.subtle.importKey("jwk", privateJwk, ALG, false, ["sign"]);
  const body = toB64Url(encoder.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign(SIGN, key, encoder.encode(body));
  return `${body}.${toB64Url(new Uint8Array(sig))}`;
}

// Server or browser: check a pass. Returns the pass if it is genuine and not expired, else null.
export async function verifyToken(token: string, publicJwk: JsonWebKey, now = Date.now()): Promise<Entitlement | null> {
  try {
    const parts = token.trim().split(".");
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const key = await crypto.subtle.importKey("jwk", publicJwk, ALG, false, ["verify"]);
    const valid = await crypto.subtle.verify(SIGN, key, fromB64Url(sig), encoder.encode(body));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64Url(body))) as Entitlement;
    if (payload.v !== 1 || typeof payload.expiresAt !== "number" || typeof payload.paymentId !== "string") return null;
    if (payload.expiresAt <= now) return null; // expired
    return payload;
  } catch {
    return null; // malformed: treat as no pass
  }
}

// Used by the key-generation script and tests.
export async function generateSigningKeys(): Promise<{ privateJwk: JsonWebKey; publicJwk: JsonWebKey }> {
  const pair = await crypto.subtle.generateKey(ALG, true, ["sign", "verify"]);
  return {
    privateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
    publicJwk: await crypto.subtle.exportKey("jwk", pair.publicKey),
  };
}
