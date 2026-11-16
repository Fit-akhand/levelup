// Server-side payment settings, read from environment variables (never from the browser).
//
//   PAYMENTS_MODE          "razorpay" (default) or "mock" (local development ONLY)
//   RAZORPAY_KEY_ID        from the Razorpay dashboard (test keys start with rzp_test_)
//   RAZORPAY_KEY_SECRET    from the Razorpay dashboard. NEVER share or commit this.
//   PAYMENT_SIGNING_KEY_JWK  private key that signs Plus passes (made by `npm run keys`)

export type PaymentsMode = "razorpay" | "mock";

export interface PaymentsConfig {
  mode: PaymentsMode;
  keyId?: string;
  keySecret?: string;
  signingKey?: JsonWebKey;
}

type Env = Record<string, string | undefined>;

// Coupon codes, from the COUPON_CODES variable:  "WELCOME30:30,FRIEND:14"  (CODE:days of free Plus).
// Kept in the environment, not in the code, so codes are not public in the repository and can be
// changed or removed without a new release. Codes are case-insensitive. Bad entries are skipped.
export function couponConfig(env: Env = process.env): Map<string, number> {
  const coupons = new Map<string, number>();
  for (const part of (env.COUPON_CODES ?? "").split(",")) {
    const [rawCode, rawDays] = part.split(":").map((s) => s.trim());
    if (!rawCode || !rawDays) continue;
    const code = rawCode.toUpperCase();
    const days = Number(rawDays);
    if (!/^[A-Z0-9_-]{3,32}$/.test(code) || !Number.isInteger(days) || days < 1 || days > 365) continue;
    coupons.set(code, days);
  }
  return coupons;
}

export function paymentsConfig(env: Env = process.env): PaymentsConfig {
  // Mock mode skips real payments, so it can NEVER run in production, whatever the settings say.
  const mock = env.PAYMENTS_MODE === "mock" && env.NODE_ENV !== "production";
  let signingKey: JsonWebKey | undefined;
  try {
    signingKey = env.PAYMENT_SIGNING_KEY_JWK ? (JSON.parse(env.PAYMENT_SIGNING_KEY_JWK) as JsonWebKey) : undefined;
  } catch {
    signingKey = undefined;
  }
  return {
    mode: mock ? "mock" : "razorpay",
    keyId: env.RAZORPAY_KEY_ID || undefined,
    keySecret: env.RAZORPAY_KEY_SECRET || undefined,
    signingKey,
  };
}
