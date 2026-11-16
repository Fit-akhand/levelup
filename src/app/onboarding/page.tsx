import Onboarding from "@/components/Onboarding";

// A page is just a component in a folder: this file lives at src/app/onboarding/page.tsx,
// so it is served at the URL /onboarding.
export const metadata = { title: "Get started · Level Up" };

export default function OnboardingPage() {
  return <Onboarding />;
}
