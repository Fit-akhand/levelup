// The Level Up mark: two stacked chevrons pointing up (levelling up) in a green rounded square.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path
        d="m9 15 7-6 7 6M9 22l7-6 7 6"
        fill="none"
        stroke="var(--on-primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
      <LogoMark />
      <span>
        Level <span className="text-accent">Up</span>
      </span>
    </span>
  );
}
