// One switch for everything money-related (Plus, pricing page, coupons, payment API routes).
// OFF by default. While it is off, every feature is free and no payment UI is shown.
// Turn it on later with NEXT_PUBLIC_PAYMENTS_ENABLED=true (see .env.example).
// It must be written exactly like this for Next.js to inline it into the browser code.
export function paymentsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";
}
