// A tiny seeded random number generator.
// Math.random() gives different results every run, which makes plans impossible to test.
// A seeded generator gives the SAME "random" numbers for the same seed, so a plan is
// reproducible (same user + same week = same plan) while still varying week to week.

// Turns a string into a number we can use as a seed.
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// "mulberry32": a small, fast, well-known generator. Returns numbers in [0, 1).
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
