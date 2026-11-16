// Talking to Razorpay. SERVER ONLY (it uses the secret key and Node's crypto module).
//
// The flow Razorpay expects:
//   1. our server creates an ORDER (amount decided by us)            -> create-order route
//   2. the browser opens Razorpay's checkout for that order; the user pays there
//      (card/UPI details go to Razorpay only; they never touch our server)
//   3. Razorpay hands the browser a payment id + a SIGNATURE
//   4. our server checks the signature and asks Razorpay what was really paid -> verify route
import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.razorpay.com/v1";

export interface RazorpayCreds {
  keyId: string;
  keySecret: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
  status: string;
  notes?: Record<string, string>;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  status: string; // "captured" once the money is really taken
  amount: number;
}

function authHeader({ keyId, keySecret }: RazorpayCreds): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function call<T>(creds: RazorpayCreds, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: authHeader(creds), "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Razorpay ${path} failed with status ${res.status}`);
  return (await res.json()) as T;
}

export function createOrder(
  creds: RazorpayCreds,
  args: { amountPaise: number; receipt: string; notes: Record<string, string> },
): Promise<RazorpayOrder> {
  return call<RazorpayOrder>(creds, "/orders", {
    method: "POST",
    body: JSON.stringify({ amount: args.amountPaise, currency: "INR", receipt: args.receipt, notes: args.notes }),
  });
}

export const fetchOrder = (creds: RazorpayCreds, orderId: string) =>
  call<RazorpayOrder>(creds, `/orders/${encodeURIComponent(orderId)}`);

export const fetchPayment = (creds: RazorpayCreds, paymentId: string) =>
  call<RazorpayPayment>(creds, `/payments/${encodeURIComponent(paymentId)}`);

// Razorpay signs "order_id|payment_id" with our secret (HMAC-SHA256). Only Razorpay and we know the
// secret, so a matching signature proves the browser did not make up the payment.
export function isValidSignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b); // constant-time compare
}
