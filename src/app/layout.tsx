import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Header from "@/components/Header";
import { paymentsEnabled } from "@/lib/features";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Level Up",
  description: "Gym, home and yoga workouts that level up with you.",
};

// Colors the phone's browser bar to match the app.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t border-line px-5 py-6 text-center text-xs text-muted">
          <div className="mb-2 flex justify-center gap-4 font-semibold text-accent">
            <Link href="/library" className="underline underline-offset-4">
              Exercise library
            </Link>
            {paymentsEnabled() && (
              <Link href="/pricing" className="underline underline-offset-4">
                Level Up Plus
              </Link>
            )}
          </div>
          Level Up gives general fitness guidance, not medical advice. If you feel pain or unwell, stop and talk to a
          doctor or coach.
        </footer>
      </body>
    </html>
  );
}
