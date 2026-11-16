# Payments (Level Up Plus)

Plus is sold as **one-time passes** (1 month, 3 months, 1 year) through **Razorpay**. There is no
auto-renewal. Prices live in `src/lib/payments/plans.ts` (the only place to change them).

> **Payments are currently OFF.** The switch is `NEXT_PUBLIC_PAYMENTS_ENABLED` (default off). While off, meal plans are free for everyone,
> the pricing page, welcome coupon card and footer link are hidden, and the payment/coupon API routes return `payments_disabled`.
> To turn payments on, set `NEXT_PUBLIC_PAYMENTS_ENABLED=true` and finish the go-live checklist below.

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

## Free-month coupons

New users see a "Welcome gift" card on their plan page (and on `/pricing`) where they can enter a coupon code for free Plus.

- Codes live in the `COUPON_CODES` environment variable as `CODE:days` pairs, e.g. `WELCOME30:30,FRIEND:14`. They are **not** in the source code, so they are not public in the repo. Change or remove a code by editing the variable.
- The server checks the code and returns a signed pass for that many days (the same kind of pass as a purchase). Codes are case-insensitive. Wrong codes get one generic error.
- **One free month per person is only enforced per device.** The app remembers a used coupon in the browser, but someone who clears their browser data (or uses another phone) can redeem again, and anyone who learns the code can share it. Real once-per-person needs accounts (and a database to record redemptions).
- Pick a code that is hard to guess (not `FREE` or `WELCOME`). There is no rate limiting on guesses yet.
- Switch coupons off any time by emptying `COUPON_CODES`.

## Known limits (important)

- **Soft paywall.** The app has no accounts or database and all code runs in the browser, so a determined person can still
  edit the app's JavaScript to skip the check. The signed pass stops casual cheating, not a developer. To lock content for real,
  generate the premium content on the server after verifying the pass (this would send user data to the server).
- **Passes live on one device.** Clearing browser data loses it; the "restore code" on the pricing page recovers it.
- **Sharing:** a pass or restore code can be shared with friends. Real protection needs accounts.
- **No webhook yet.** If a browser closes right after paying, the user must contact support or retry. Add a Razorpay webhook
  (`payment.captured`) plus a small database for reliability.
- **No rate limiting** on the API routes yet.
