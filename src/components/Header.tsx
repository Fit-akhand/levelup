import Link from "next/link";
import Logo from "./Logo";

const LINK = "rounded-full px-2.5 py-2 text-sm font-semibold text-muted hover:text-foreground";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-5">
        <Link href="/" aria-label="Level Up home">
          <Logo />
        </Link>
        <nav className="flex items-center">
          <Link href="/plan" className={LINK}>
            My plan
          </Link>
          <Link href="/diet" className={LINK}>
            Diet
          </Link>
          <Link href="/progress" className={LINK}>
            Progress
          </Link>
        </nav>
      </div>
    </header>
  );
}
