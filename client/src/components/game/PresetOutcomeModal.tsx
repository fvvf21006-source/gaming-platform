import { useState } from "react";
import type { GameSession } from "../../api/client";
import { usePresetGameOutcome } from "../../hooks/useGames";
import { formatPoints } from "../../utils/points";
import OutcomePicker from "./OutcomePicker";

interface Props {
  session: GameSession;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Presets the result of a round the player is playing right now. */
export default function PresetOutcomeModal({ session, onClose, onDone }: Props) {
  const preset = usePresetGameOutcome();
  const [score, setScore] = useState<number | null>(session.forcedScore ?? null);
  const [error, setError] = useState("");

  const player = session.playerUsername ?? session.userId.slice(0, 6);

  const submit = () => {
    if (score === null || !Number.isInteger(score) || score < 0) {
      setError("Pick a result first.");
      return;
    }
    setError("");
    preset.mutate(
      { sessionId: session.id, score },
      {
        onSuccess: () => onDone(`Outcome set for "${player}": ${session.gameName} will pay ${formatPoints(score)} pts.`),
        onError: (e: Error) => setError(e.message || "Failed to set outcome"),
      }
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", padding: 16, background: "rgba(5,4,12,.85)", backdropFilter: "blur(8px)", overflowY: "auto" }}>
      <div className="pl-glass pop-in" style={{ width: "min(540px, 100%)", padding: 26, borderRadius: 16, border: "1px solid rgba(255,209,102,0.4)" }}>
        <h3 className="font-cinzel" style={{ fontSize: 17, fontWeight: 700, color: "var(--gold)", margin: 0 }}>🎯 Set Game Outcome</h3>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 14px" }}>
          The player's {session.gameName} round will play out to the result you pick. It is recorded in the audit log.
        </p>

        <div style={{ background: "rgba(7,7,13,0.6)", borderRadius: 10, padding: 12, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 14, fontSize: 13, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
          <span><span style={{ color: "var(--muted-foreground)" }}>Player </span><strong>{player}</strong></span>
          <span><span style={{ color: "var(--muted-foreground)" }}>Buy-in </span><strong style={{ color: "var(--neon-green)" }}>{formatPoints(session.pointsSpent)} pts</strong></span>
          {session.forcedScore != null && (
            <span style={{ color: "var(--neon-cyan)" }}>Currently set: {formatPoints(session.forcedScore)} pts</span>
          )}
        </div>

        <OutcomePicker gameName={session.gameName} pointCost={session.pointsSpent} value={score} onChange={setScore} />

        {error && <div style={{ color: "var(--neon-pink)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="pl-btn ghost" style={{ flex: 1 }} onClick={onClose} disabled={preset.isPending}>Cancel</button>
          <button className="pl-btn" style={{ flex: 2 }} onClick={submit} disabled={preset.isPending || score === null}>
            {preset.isPending ? "Saving…" : score === null ? "Pick a result" : `Set result: ${formatPoints(score)} pts`}
          </button>
        </div>
      </div>
    </div>
  );
}
