// Makes the key pair that signs and checks Plus passes. Usage: npm run keys
// Copy the two printed lines into your environment (.env.local for development, your host's
// settings for production). The PRIVATE one must stay secret and server-side only.
import { generateSigningKeys } from "../src/lib/payments/token.ts";

const { privateJwk, publicJwk } = await generateSigningKeys();
console.log(`PAYMENT_SIGNING_KEY_JWK='${JSON.stringify(privateJwk)}'`);
console.log(`NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY_JWK='${JSON.stringify(publicJwk)}'`);
