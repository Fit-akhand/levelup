// A small reusable helper: "one value saved in the browser's localStorage, with a React hook".
// The profile and the workout history both use it, so the tricky parts (safe access, updating
// every screen when data changes, server rendering) are written once.
import { useMemo, useSyncExternalStore } from "react";

export function createLocalStore<T>(key: string, parse: (raw: string | null) => T | null) {
  const changeEvent = `levelup:changed:${key}`; // lets this tab react when we save/clear

  function subscribe(onChange: () => void): () => void {
    window.addEventListener("storage", onChange); // another tab changed it
    window.addEventListener(changeEvent, onChange); // this tab changed it
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(changeEvent, onChange);
    };
  }

  // localStorage can throw (private mode, blocked storage), so every access is wrapped.
  function readRaw(): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  // Returns true if saved, false if the browser blocked storage.
  function save(value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new Event(changeEvent));
      return true;
    } catch {
      return false;
    }
  }

  function clear(): void {
    try {
      localStorage.removeItem(key);
      window.dispatchEvent(new Event(changeEvent));
    } catch {
      /* nothing to clear */
    }
  }

  // Non-React read, for event handlers.
  function read(): T | null {
    return parse(readRaw());
  }

  // React hook. useSyncExternalStore reads data that lives OUTSIDE React and re-renders on change.
  //   undefined = "not loaded yet" (server / first paint), null = "nothing valid saved", value = data.
  function useValue(): T | null | undefined {
    const raw = useSyncExternalStore<string | null | undefined>(subscribe, readRaw, () => undefined);
    return useMemo(() => (raw === undefined ? undefined : parse(raw)), [raw]);
  }

  return { save, clear, read, useValue };
}
