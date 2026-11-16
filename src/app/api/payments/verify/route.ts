// POST /api/payments/verify   body: { orderId, paymentId, signature }
// Step 3 of buying a pass. We do NOT believe the browser: we check Razorpay's signature, then ask
// Razorpay directly what was paid. Only then do we sign a Plus pass.
//
// The plan and its length come from the ORDER stored at Razorpay (created by our server), never from
// anything the browser sends, so paying for the cheap plan cannot unlock the expensive one.
import { paymentsEnabled } from "../../../../lib/features.ts";
import { paymentsConfig } from "../../../../lib/payments/config.ts";
import { planById, type PlanDef } from "../../../../lib/payments/plans.ts";
import { fetchOrder, fetchPayment, isValidSignature } from "../../../../lib/payments/razorpay.ts";
import { signToken, type Entitlement } from "../../../../lib/payments/token.ts";

const DAY_MS = 86_400_000;

export async function POST(request: Request): Promise<Response> {
  if (!paymentsEnabled()) return Response.json({ error: "payments_disabled" }, { status: 503 });
  let body: { orderId?: unknown; paymentId?: unknown; signature?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const { orderId, paymentId, signature } = body;
  if (typeof orderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string") {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (orderId.length > 100 || paymentId.length > 100 || signature.length > 200) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const cfg = paymentsConfig();
  if (!cfg.signingKey) return Response.json({ error: "payments_not_configured" }, { status: 503 });

  let plan: PlanDef | undefined;

  if (cfg.mode === "mock") {
    // Local development only. The order id looks like  mock_<planId>_<receipt>.
    const m = /^mock_(plus_[a-z]+)_/.exec(orderId);
    plan = planById(m?.[1]);
    if (!plan) return Response.json({ error: "invalid_payment" }, { status: 400 });
  } else {
    if (!cfg.keyId || !cfg.keySecret) return Response.json({ error: "payments_not_configured" }, { status: 503 });
    if (!isValidSignature(orderId, paymentId, signature, cfg.keySecret)) {
      return Response.json({ error: "invalid_payment" }, { status: 400 });
    }
    try {
      const creds = { keyId: cfg.keyId, keySecret: cfg.keySecret };
      const [order, payment] = await Promise.all([fetchOrder(creds, orderId), fetchPayment(creds, paymentId)]);
      plan = planById(order.notes?.planId);
      const paidInFull =
        plan !== undefined &&
        payment.order_id === orderId &&
        payment.status === "captured" &&
        payment.amount === plan.pricePaise &&
        order.amount === plan.pricePaise;
      if (!paidInFull) return Response.json({ error: "invalid_payment" }, { status: 400 });
    } catch {
      return Response.json({ error: "gateway_error" }, { status: 502 });
    }
  }

  const now = Date.now();
  const entitlement: Entitlement = {
    v: 1,
    planId: plan!.id,
    paymentId,
    issuedAt: now,
    expiresAt: now + plan!.days * DAY_MS,
  };
  const token = await signToken(entitlement, cfg.signingKey);
  return Response.json({ token, planId: plan!.id, expiresAt: entitlement.expiresAt });
}
