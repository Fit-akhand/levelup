// POST /api/payments/create-order   body: { "planId": "plus_month" }
// Step 1 of buying a pass. The server picks the price (from plans.ts), never the browser.
// Relative ".ts" imports (not "@/") let the tests call this handler directly in Node.
import { paymentsConfig } from "../../../../lib/payments/config.ts";
import { planById } from "../../../../lib/payments/plans.ts";
import { createOrder } from "../../../../lib/payments/razorpay.ts";

export async function POST(request: Request): Promise<Response> {
  let body: { planId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const plan = planById(body.planId);
  if (!plan) return Response.json({ error: "unknown_plan" }, { status: 400 });

  const cfg = paymentsConfig();
  const receipt = `lvl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`; // max 40 chars

  // Local development only: pretend an order exists. paymentsConfig() makes this impossible in production.
  if (cfg.mode === "mock") {
    return Response.json({
      mode: "mock",
      orderId: `mock_${plan.id}_${receipt}`,
      amount: plan.pricePaise,
      currency: "INR",
      planName: plan.name,
    });
  }

  if (!cfg.keyId || !cfg.keySecret || !cfg.signingKey) {
    return Response.json({ error: "payments_not_configured" }, { status: 503 });
  }

  try {
    const order = await createOrder(
      { keyId: cfg.keyId, keySecret: cfg.keySecret },
      // The plan id is stored on the order so verify can read it back from Razorpay (not from the browser).
      { amountPaise: plan.pricePaise, receipt, notes: { planId: plan.id } },
    );
    return Response.json({
      mode: "razorpay",
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: cfg.keyId, // the PUBLIC key id; the secret never leaves the server
      planName: plan.name,
    });
  } catch {
    return Response.json({ error: "gateway_error" }, { status: 502 });
  }
}
