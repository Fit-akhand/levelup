import Link from "next/link";
import { DumbbellIcon, HomeIcon, ShieldIcon, YogaIcon } from "@/components/Icons";
import { LogoMark } from "@/components/Logo";

const PLACES = [
  { icon: <DumbbellIcon size={26} />, title: "Gym", text: "Machines, dumbbells and barbells, planned so every day is balanced." },
  { icon: <HomeIcon size={26} />, title: "Home", text: "No equipment? Bodyweight workouts with just a chair or a backpack." },
  { icon: <YogaIcon size={26} />, title: "Yoga", text: "Flows for flexibility, calm and strength, with breathing built in." },
];

const STEPS = [
  { n: "1", title: "Tell us about you", text: "Age, goal, level and where you train. It takes about a minute." },
  { n: "2", title: "Get your plan", text: "A weekly plan built for your goal, with how-to steps for every move." },
  { n: "3", title: "Level up", text: "Each week adds a little more, with a recovery week built in." },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-96"
          style={{ background: "radial-gradient(60% 60% at 50% 0%, var(--glow), transparent 70%)" }}
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-5 pb-14 pt-14 text-center sm:pt-20">
          <div className="animate-rise">
            <LogoMark size={64} />
          </div>
          <h1 className="animate-rise mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl" style={{ animationDelay: "60ms" }}>
            Train smart.
            <br />
            <span className="text-accent">Level up</span> every week.
          </h1>
          <p className="animate-rise mt-5 max-w-lg text-lg text-muted" style={{ animationDelay: "120ms" }}>
            Workouts for gym, home and yoga, built for ages 15 to 20. Pick your goal and get your plan in under a minute.
          </p>
          <div className="animate-rise mt-8 flex flex-col items-center gap-3" style={{ animationDelay: "180ms" }}>
            <Link href="/onboarding" className="btn btn-primary px-10 text-lg">
              Start your journey
            </Link>
            <Link href="/plan" className="text-sm font-semibold text-muted underline-offset-4 hover:text-foreground hover:underline">
              Already started? View my plan
            </Link>
          </div>
        </div>
      </section>

      {/* Where you train */}
      <section className="mx-auto max-w-3xl px-5 pb-14">
        <h2 className="text-center text-2xl font-extrabold tracking-tight">Train your way</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PLACES.map((p) => (
            <div key={p.title} className="card p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tint text-accent">{p.icon}</span>
              <h3 className="mt-4 text-lg font-bold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-3xl px-5 pb-14">
        <h2 className="text-center text-2xl font-extrabold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="card p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-on-primary">
                {s.n}
              </span>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Safety promise */}
      <section className="mx-auto max-w-3xl px-5 pb-16">
        <div className="card flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:gap-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tint text-accent">
            <ShieldIcon size={26} />
          </span>
          <div>
            <h2 className="text-lg font-bold">Built to be safe for teens</h2>
            <p className="mt-1 text-sm text-muted">
              Under-18 plans use gentler, technique-first workouts. We never judge your body, and your details stay on
              your own device.
            </p>
          </div>
        </div>
        <div className="mt-8 text-center">
          <Link href="/onboarding" className="btn btn-primary px-10">
            Get my plan
          </Link>
        </div>
      </section>
    </main>
  );
}
