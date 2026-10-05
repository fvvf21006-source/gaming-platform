import { useCallback, useEffect, useRef } from "react";

/**
 * Reports a casino round's score exactly once, after a short delay so the
 * player can see the result. The pending timer is dropped on unmount, so
 * leaving the screen can never submit a stale score.
 */
export function useSettle(onComplete: (score: number) => void, delayMs = 1600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settled = useRef(false);
  const latest = useRef(onComplete);
  latest.current = onComplete;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return useCallback((score: number) => {
    if (settled.current) return;
    settled.current = true;
    timer.current = setTimeout(() => latest.current(score), delayMs);
  }, [delayMs]);
}
