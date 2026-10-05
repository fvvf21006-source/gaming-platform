import { useCallback } from "react";
import { getGameOutcome } from "../../api/client";

/**
 * Asks the server whether a supervisor preset this round's result. Returns the
 * preset score in points, or null for a normal random round. A failed lookup
 * is treated as "no preset" so a flaky request never blocks play; the server
 * still applies the preset when the session completes.
 */
export function useForcedOutcome(sessionId?: string) {
  return useCallback(async (): Promise<number | null> => {
    if (!sessionId) return null;
    try {
      const { forcedScore } = await getGameOutcome(sessionId);
      return forcedScore;
    } catch {
      return null;
    }
  }, [sessionId]);
}
