import { notFound } from "next/navigation";
import Pricing from "@/components/Pricing";
import { paymentsEnabled } from "@/lib/features";

export const metadata = { title: "Level Up Plus" };

export default function PricingPage() {
  if (!paymentsEnabled()) notFound(); // payments are switched off for now
  return <Pricing />;
}
