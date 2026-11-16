import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { PLANS, formatRupees, planById } from "./plans.ts";
import { generateSigningKeys, signToken, verifyToken, type Entitlement } from "./token.ts";
import { isValidSignature } from "./razorpay.ts";
import { paymentsConfig } from "./config.ts";
import { POST as createOrderRoute } from "../../app/api/payments/create-order/route.ts";
import { POST as verifyRoute } from "../../app/api/payments/verify/route.ts";

const DAY = 86_400_000;
const SECRET = "test_secret_value";
const keys = await generateSigningKeys();

const req = (body: unknown) =>
  new Request("http://localhost/api", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
const sign = (orderId: string, paymentId: string) => createHmac("sha256", SECRET).update(`${orderId}|${paymentId}`).digest("hex");

// Run a test with certain environment variables and a fake Razorpay (fetch), then restore everything.
async function withEnv<T>(
  env: Record<string, string | undefined>,
  fake: ((url: string, init?: RequestInit) => unknown) | null,
  fn: (calls: { url: string; init?: RequestInit }[]) => Promise<T>,
): Promise<T> {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) saved[k] = process.env[k];
  const realFetch = globalThis.fetch;
  const calls: { url: string; init?: RequestInit }[] = [];
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  if (fake) {
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      const out = fake(String(url), init);
      return out instanceof Response ? out : Response.json(out);
    }) as typeof fetch;
  }
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = realFetch;
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const LIVE = {
  PAYMENTS_MODE: undefined,
  NODE_ENV: "production",
  RAZORPAY_KEY_ID: "rzp_test_abc",
  RAZORPAY_KEY_SECRET: SECRET,
  PAYMENT_SIGNING_KEY_JWK: JSON.stringify(keys.privateJwk),
};

// ───────────── Plans ─────────────

test("plans: unique ids, positive prices, longer passes are cheaper per day", () => {
  assert.equal(new Set(PLANS.map((p) => p.id)).size, PLANS.length);
  for (const p of PLANS) assert.ok(p.pricePaise > 0 && Number.isInteger(p.pricePaise) && p.days > 0);
  const perDay = PLANS.map((p) => p.pricePaise / p.days);
  for (let i = 1; i < perDay.length; i++) assert.ok(perDay[i] < perDay[i - 1], "longer plans should cost less per day");
  assert.equal(planById("nope"), undefined);
  assert.equal(formatRupees(2900), "₹29");
});

// ───────────── Signed passes ─────────────

const pass = (over: Partial<Entitlement> = {}): Entitlement => ({
  v: 1, planId: "plus_month", paymentId: "pay_1", issuedAt: Date.now(), expiresAt: Date.now() + DAY, ...over,
});

test("a signed pass verifies with the public key", async () => {
  const token = await signToken(pass(), keys.privateJwk);
  const got = await verifyToken(token, keys.publicJwk);
  assert.equal(got?.planId, "plus_month");
  assert.equal(got?.paymentId, "pay_1");
});

test("a pass that was edited is rejected", async () => {
  const token = await signToken(pass(), keys.privateJwk);
  const [, sig] = token.split(".");
  const forgedBody = Buffer.from(JSON.stringify(pass({ planId: "plus_year", expiresAt: Date.now() + 999 * DAY }))).toString("base64url");
  assert.equal(await verifyToken(`${forgedBody}.${sig}`, keys.publicJwk), null);
});

test("a pass signed with a different key is rejected", async () => {
  const other = await generateSigningKeys();
  const token = await signToken(pass(), other.privateJwk);
  assert.equal(await verifyToken(token, keys.publicJwk), null);
});

test("an expired pass is rejected", async () => {
  const token = await signToken(pass({ expiresAt: Date.now() - 1000 }), keys.privateJwk);
  assert.equal(await verifyToken(token, keys.publicJwk), null);
});

test("garbage is rejected without throwing", async () => {
  for (const junk of ["", "abc", "a.b", "a.b.c", "{}", "....", "é.é"]) assert.equal(await verifyToken(junk, keys.publicJwk), null);
});

// ───────────── Razorpay signature ─────────────

test("Razorpay signature: genuine accepted, forged or altered rejected", () => {
  const good = sign("order_1", "pay_1");
  assert.equal(isValidSignature("order_1", "pay_1", good, SECRET), true);
  assert.equal(isValidSignature("order_1", "pay_2", good, SECRET), false, "different payment");
  assert.equal(isValidSignature("order_2", "pay_1", good, SECRET), false, "different order");
  assert.equal(isValidSignature("order_1", "pay_1", good, "other_secret"), false, "different secret");
  assert.equal(isValidSignature("order_1", "pay_1", "", SECRET), false, "empty");
  assert.equal(isValidSignature("order_1", "pay_1", good.slice(0, -2), SECRET), false, "truncated");
});

// ───────────── Config safety ─────────────

test("mock mode can never run in production", () => {
  assert.equal(paymentsConfig({ PAYMENTS_MODE: "mock", NODE_ENV: "production" }).mode, "razorpay");
  assert.equal(paymentsConfig({ PAYMENTS_MODE: "mock", NODE_ENV: "development" }).mode, "mock");
  assert.equal(paymentsConfig({ NODE_ENV: "development" }).mode, "razorpay");
});

test("an unreadable signing key is treated as missing", () => {
  assert.equal(paymentsConfig({ PAYMENT_SIGNING_KEY_JWK: "{not json" }).signingKey, undefined);
});

// ───────────── create-order route ─────────────

test("create-order: rejects bad input", async () => {
  await withEnv(LIVE, null, async () => {
    assert.equal((await createOrderRoute(req("not json"))).status, 400);
    assert.equal((await createOrderRoute(req({}))).status, 400);
    assert.equal((await createOrderRoute(req({ planId: "plus_free_forever" }))).status, 400);
  });
});

test("create-order: the SERVER sets the price, ignoring any amount the browser sends", async () => {
  const fake = () => ({ id: "order_X", amount: 2900, currency: "INR", status: "created" });
  await withEnv(LIVE, fake, async (calls) => {
    const res = await createOrderRoute(req({ planId: "plus_month", amount: 1, price: 1 }));
    assert.equal(res.status, 200);
    const out = await res.json();
    assert.equal(out.orderId, "order_X");
    assert.equal(out.keyId, "rzp_test_abc");
    assert.ok(!JSON.stringify(out).includes(SECRET), "the secret must never be sent to the browser");
    const sent = JSON.parse(String(calls[0].init?.body));
    assert.equal(sent.amount, 2900, "price comes from plans.ts");
    assert.equal(sent.currency, "INR");
    assert.equal(sent.notes.planId, "plus_month");
    const auth = (calls[0].init?.headers as Record<string, string>).Authorization;
    assert.equal(auth, `Basic ${Buffer.from(`rzp_test_abc:${SECRET}`).toString("base64")}`);
  });
});

test("create-order: says so when payments are not configured, and survives gateway failures", async () => {
  await withEnv({ ...LIVE, RAZORPAY_KEY_SECRET: undefined }, null, async () => {
    assert.equal((await createOrderRoute(req({ planId: "plus_month" }))).status, 503);
  });
  await withEnv(LIVE, () => new Response("boom", { status: 500 }), async () => {
    assert.equal((await createOrderRoute(req({ planId: "plus_month" }))).status, 502);
  });
});

// ───────────── verify route ─────────────

const goodOrder = (planId = "plus_month", amount = 2900) => ({ id: "order_1", amount, currency: "INR", status: "paid", notes: { planId } });
const goodPayment = (over = {}) => ({ id: "pay_1", order_id: "order_1", status: "captured", amount: 2900, ...over });
const razorpayFake = (order: unknown, payment: unknown) => (url: string) => (url.includes("/orders/") ? order : payment);

test("verify: a genuine payment yields a pass that checks out and lasts the plan's length", async () => {
  await withEnv(LIVE, razorpayFake(goodOrder(), goodPayment()), async () => {
    const before = Date.now();
    const res = await verifyRoute(req({ orderId: "order_1", paymentId: "pay_1", signature: sign("order_1", "pay_1") }));
    assert.equal(res.status, 200);
    const out = await res.json();
    const got = await verifyToken(out.token, keys.publicJwk);
    assert.equal(got?.planId, "plus_month");
    assert.equal(got?.paymentId, "pay_1");
    assert.ok(Math.abs((got!.expiresAt - before) - 30 * DAY) < 5000);
  });
});

test("verify: the plan comes from the order at Razorpay, so a yearly pass cannot be claimed with a monthly payment", async () => {
  // The browser sends planId: plus_year, but the order really was for the month plan.
  await withEnv(LIVE, razorpayFake(goodOrder("plus_month"), goodPayment()), async () => {
    const res = await verifyRoute(req({ orderId: "order_1", paymentId: "pay_1", signature: sign("order_1", "pay_1"), planId: "plus_year" }));
    const got = await verifyToken((await res.json()).token, keys.publicJwk);
    assert.equal(got?.planId, "plus_month");
  });
});

test("verify: rejects forged signatures, unpaid, underpaid and mismatched payments", async () => {
  const body = { orderId: "order_1", paymentId: "pay_1", signature: sign("order_1", "pay_1") };
  await withEnv(LIVE, razorpayFake(goodOrder(), goodPayment()), async () => {
    assert.equal((await verifyRoute(req({ ...body, signature: "0".repeat(64) }))).status, 400, "forged signature");
  });
  await withEnv(LIVE, razorpayFake(goodOrder(), goodPayment({ status: "authorized" })), async () => {
    assert.equal((await verifyRoute(req(body))).status, 400, "not captured yet");
  });
  await withEnv(LIVE, razorpayFake(goodOrder("plus_year", 2900), goodPayment({ amount: 2900 })), async () => {
    assert.equal((await verifyRoute(req(body))).status, 400, "paid the month price for the year plan");
  });
  await withEnv(LIVE, razorpayFake(goodOrder(), goodPayment({ order_id: "order_OTHER" })), async () => {
    assert.equal((await verifyRoute(req(body))).status, 400, "payment belongs to another order");
  });
  await withEnv(LIVE, razorpayFake(goodOrder("plus_lifetime"), goodPayment()), async () => {
    assert.equal((await verifyRoute(req(body))).status, 400, "unknown plan on the order");
  });
});

test("verify: bad input and gateway errors are handled", async () => {
  await withEnv(LIVE, null, async () => {
    assert.equal((await verifyRoute(req("nope"))).status, 400);
    assert.equal((await verifyRoute(req({ orderId: 1, paymentId: 2, signature: 3 }))).status, 400);
    assert.equal((await verifyRoute(req({ orderId: "x".repeat(500), paymentId: "p", signature: "s" }))).status, 400);
  });
  await withEnv(LIVE, () => new Response("boom", { status: 500 }), async () => {
    const res = await verifyRoute(req({ orderId: "order_1", paymentId: "pay_1", signature: sign("order_1", "pay_1") }));
    assert.equal(res.status, 502);
  });
});

test("mock mode works in development but a mock order is worthless in production", async () => {
  const DEV = { ...LIVE, NODE_ENV: "development", PAYMENTS_MODE: "mock" };
  await withEnv(DEV, null, async () => {
    const order = await (await createOrderRoute(req({ planId: "plus_quarter" }))).json();
    assert.equal(order.mode, "mock");
    assert.equal(order.amount, 6900);
    const res = await verifyRoute(req({ orderId: order.orderId, paymentId: "pay_mock", signature: "x" }));
    const got = await verifyToken((await res.json()).token, keys.publicJwk);
    assert.equal(got?.planId, "plus_quarter");
  });
  // Same request in production: mock is ignored, so the fake order fails the real signature check.
  await withEnv({ ...LIVE, PAYMENTS_MODE: "mock" }, null, async () => {
    const res = await verifyRoute(req({ orderId: "mock_plus_year_abc", paymentId: "pay_mock", signature: "x" }));
    assert.equal(res.status, 400);
  });
});
