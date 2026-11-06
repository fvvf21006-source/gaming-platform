import { useCallback, useRef } from "react";

/** Submit a finished round immediately so leaving cannot cancel its payout. */
export function useSettle(onComplete: (score: number) => void) {
  const settled = useRef(false);
  const latest = useRef(onComplete);
  latest.current = onComplete;
  return useCallback((score: number) => {
    if (settled.current) return;
    settled.current = true;
    latest.current(score);
  }, []);
}
