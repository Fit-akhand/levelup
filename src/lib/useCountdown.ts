// A countdown timer hook, used for rest periods and timed exercises (planks, cardio, yoga holds).
//
// Why store an END TIME instead of subtracting 1 each second? Browsers slow down timers in
// background tabs, so "subtract 1 per tick" drifts. Comparing against Date.now() stays correct.
import { useCallback, useEffect, useRef, useState } from "react";

export function useCountdown(onDone?: () => void) {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false); // true once a countdown has run all the way to 0
  const endsAt = useRef(0);
  const doneRef = useRef(onDone);

  // Keep the latest callback in a ref so the interval below never calls a stale version.
  useEffect(() => {
    doneRef.current = onDone;
  });

  const start = useCallback((seconds: number) => {
    endsAt.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setFinished(false);
    setRunning(true);
  }, []);

  const addTime = useCallback((seconds: number) => {
    endsAt.current += seconds * 1000;
    setRemaining((r) => r + seconds);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    setFinished(false);
    setRemaining(0);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        setFinished(true);
        doneRef.current?.();
      }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  return { remaining, running, finished, start, addTime, stop };
}
