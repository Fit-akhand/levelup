// POST /api/coupons/redeem   body: { "code": "WELCOME30" }
// Trades a valid coupon code for a signed Plus pass (no payment). The codes and their lengths come
// from the COUPON_CODES environment variable, never from the browser.
//
// LIMIT: with no accounts or database, the server cannot know whether this person already used a
// coupon on another device or after clearing their browser. The app remembers it per device only.
import { paymentsEnabled } from "../../../../lib/features.ts";
import { couponConfig, paymentsConfig } from "../../../../lib/payments/config.ts";
import { signToken, type Entitlement } from "../../../../lib/payments/token.ts";

const DAY_MS = 86_400_000;

export async function POST(request: Request): Promise<Response> {
  if (!paymentsEnabled()) return Response.json({ error: "payments_disabled" }, { status: 503 });
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof body.code !== "string" || body.code.length === 0 || body.code.length > 64) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const signingKey = paymentsConfig().signingKey;
  const coupons = couponConfig();
  if (!signingKey || coupons.size === 0) {
    return Response.json({ error: "coupons_not_available" }, { status: 503 });
  }

  const code = body.code.trim().toUpperCase();
  const days = coupons.get(code);
  // The same answer for "wrong" and "expired" codes, so guessing teaches nothing.
  if (!days) return Response.json({ error: "invalid_coupon" }, { status: 400 });

  const now = Date.now();
  const entitlement: Entitlement = {
    v: 1,
    planId: "coupon",
    paymentId: `coupon:${code}`,
    issuedAt: now,
    expiresAt: now + days * DAY_MS,
  };
  const token = await signToken(entitlement, signingKey);
  return Response.json({ token, days, expiresAt: entitlement.expiresAt });
}
