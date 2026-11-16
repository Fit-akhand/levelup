# Payments (Level Up Plus)

Plus is sold as **one-time passes** (1 month, 3 months, 1 year) through **Razorpay**. There is no
auto-renewal. Prices live in `src/lib/payments/plans.ts` (the only place to change them).

## How a purchase works

```
Browser                      Our server                       Razorpay
  | POST create-order {planId} -->|                                |
  |                               |-- create order (our price) --->|
  |<-- orderId, keyId ------------|<-------------------------------|
  | open Razorpay checkout --------------------------------------->|  user pays (UPI/card)
  |<-- paymentId + signature ---------------------------------------|
  | POST verify ------------------>|-- check signature             |
  |                               |-- fetch order + payment ------>|  "was it really captured, for this plan?"
  |<-- signed Plus pass ----------|                                |
```

- The browser only sends a plan id. The **server** sets the price and reads the plan back from the order at Razorpay.
- The pass is signed with a private key (ECDSA P-256). The app checks it with the public key, so editing localStorage cannot grant Plus, and passes expire.
- Card and UPI details go to Razorpay only. We never see or store them.

## Go-live checklist

1. Create a Razorpay account and complete KYC (needs a business or your own details; this is something only you can do).
2. In the dashboard, copy your **test** keys (`rzp_test_...`) first.
3. Run `npm run keys` and copy both lines it prints.
4. Set the environment variables (see `.env.example`). In production use your host's settings, never a committed file.
5. **Enable payment auto-capture** in Razorpay (Settings > Payment capture), otherwise payments stay "authorized" and verification (correctly) refuses them.
6. Test a purchase with Razorpay's test cards/UPI. Then switch to live keys.
7. Before launch: add Terms, Privacy Policy and a Refund/Cancellation policy (Razorpay requires them), and link them from the pricing page.

## Local development without Razorpay

`.env.local` has `PAYMENTS_MODE=mock`. Buying a pass then "succeeds" instantly with no real payment. Mock mode is
ignored whenever `NODE_ENV=production` (and a test proves it).

## Known limits (important)

- **Soft paywall.** The app has no accounts or database and all code runs in the browser, so a determined person can still
  edit the app's JavaScript to skip the check. The signed pass stops casual cheating, not a developer. To lock content for real,
  generate the premium content on the server after verifying the pass (this would send user data to the server).
- **Passes live on one device.** Clearing browser data loses it; the "restore code" on the pricing page recovers it.
- **Sharing:** a pass or restore code can be shared with friends. Real protection needs accounts.
- **No webhook yet.** If a browser closes right after paying, the user must contact support or retry. Add a Razorpay webhook
  (`payment.captured`) plus a small database for reliability.
- **No rate limiting** on the API routes yet.
