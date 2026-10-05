import { useMemo, useState } from "react";
import type { GameSession } from "../../api/client";
import { usePresetGameOutcome } from "../../hooks/useGames";
import { formatPoints } from "../../utils/points";
import {
  MAX_MULTIPLIER,
  discreteMultipliers,
  outcomeKindFor,
  payoutFor,
} from "./casinoConfig";

interface Props {
  session: GameSession;
  onClose: () => void;
  onDone: (message: string) => void;
}

interface Choice {
  key: string;
  label: string;
  hint: string;
  score: number;
}

/** The results a game can end on, one chip each; chips that pay the same are merged. */
function choicesFor(session: GameSession): Choice[] | null {
  const kind = outcomeKindFor(session.gameName);
  const multipliers = discreteMultipliers(kind);
  if (!multipliers) return null;

  const seen = new Set<number>();
  const choices: Choice[] = [];
  multipliers.forEach((m, i) => {
    const score = payoutFor(session.pointsSpent, m);
    if (seen.has(score)) return;
    seen.add(score);
    const label = m === 0 ? "Lose" : `${m}x`;
    const hint = kind === "mines" && m > 0 ? `${i} safe tile${i === 1 ? "" : "s"}` : m === 0 ? "pays nothing" : "";
    choices.push({ key: `${i}`, label, hint, score });
  });
  return choices;
}

export default function PresetOutcomeModal({ session, onClose, onDone }: Props) {
  const preset = usePresetGameOutcome();
  const kind = outcomeKindFor(session.gameName);
  const choices = useMemo(() => choicesFor(session), [session]);
  const cost = session.pointsSpent;

  const [score, setScore] = useState<number | null>(session.forcedScore ?? null);
  const [crashMultiplier, setCrashMultiplier] = useState("2.00");
  const [freeScore, setFreeScore] = useState(String(session.forcedScore ?? ""));
  const [error, setError] = useState("");

  const player = session.playerUsername ?? session.userId.slice(0, 6);

  const chosenScore = (() => {
    if (kind === "crash") return score;
    if (kind === "free") return freeScore.trim() === "" ? null : Number(freeScore);
    return score;
  })();

  const crashScoreFor = (raw: string) => {
    const m = Number(raw);
    if (!Number.isFinite(m) || m < 1 || m > MAX_MULTIPLIER.crash) return null;
    return payoutFor(cost, m);
  };

  const submit = () => {
    if (chosenScore === null || !Number.isInteger(chosenScore) || chosenScore < 0) {
      setError("Pick a result first.");
      return;
    }
    setError("");
    preset.mutate(
      { sessionId: session.id, score: chosenScore },
      {
        onSuccess: () => onDone(`Outcome set for "${player}": ${session.gameName} will pay ${formatPoints(chosenScore)} pts.`),
        onError: (e: Error) => setError(e.message || "Failed to set outcome"),
      }
    );
  };

  const chip = (selected: boolean): React.CSSProperties => ({
    background: selected ? "rgba(255,209,102,0.18)" : "rgba(255,255,255,0.05)",
    border: `1px solid ${selected ? "var(--gold)" : "rgba(255,255,255,0.12)"}`,
    borderRadius: 10,
    padding: "8px 6px",
    color: "var(--foreground)",
    cursor: "pointer",
    fontFamily: "Outfit, sans-serif",
    textAlign: "center",
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", padding: 16, background: "rgba(5,4,12,.85)", backdropFilter: "blur(8px)", overflowY: "auto" }}>
      <div className="pl-glass pop-in" style={{ width: "min(540px, 100%)", padding: 26, borderRadius: 16, border: "1px solid rgba(255,209,102,0.4)" }}>
        <h3 className="font-cinzel" style={{ fontSize: 17, fontWeight: 700, color: "var(--gold)", margin: 0 }}>🎯 Set Game Outcome</h3>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 14px" }}>
          The player's {session.gameName} round will play out to the result you pick. It is recorded in the audit log.
        </p>

        <div style={{ background: "rgba(7,7,13,0.6)", borderRadius: 10, padding: 12, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 14, fontSize: 13, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
          <span><span style={{ color: "var(--muted-foreground)" }}>Player </span><strong>{player}</strong></span>
          <span><span style={{ color: "var(--muted-foreground)" }}>Buy-in </span><strong style={{ color: "var(--neon-green)" }}>{formatPoints(cost)} pts</strong></span>
          {session.forcedScore != null && (
            <span style={{ color: "var(--neon-cyan)" }}>Currently set: {formatPoints(session.forcedScore)} pts</span>
          )}
        </div>

        {choices && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 8, maxHeight: 260, overflowY: "auto", marginBottom: 14 }}>
            {choices.map((c) => (
              <button key={c.key} type="button" style={chip(score === c.score)} onClick={() => setScore(c.score)}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{c.label}</div>
                <div className="font-mono-data" style={{ fontSize: 12, color: "var(--gold)" }}>{formatPoints(c.score)} pts</div>
                {c.hint && <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{c.hint}</div>}
              </button>
            ))}
          </div>
        )}

        {kind === "crash" && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <button type="button" style={chip(score === 0)} onClick={() => setScore(0)}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Crash at 1.00x</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>pays nothing</div>
              </button>
              <button type="button" style={chip(score !== null && score > 0)} onClick={() => setScore(crashScoreFor(crashMultiplier))}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Cash out at a multiplier</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>rocket flies to it</div>
              </button>
            </div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 }}>
              Multiplier (1.00 – {MAX_MULTIPLIER.crash}x)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="number" min={1} max={MAX_MULTIPLIER.crash} step={0.01}
                value={crashMultiplier}
                onChange={(e) => { setCrashMultiplier(e.target.value); setScore(crashScoreFor(e.target.value)); }}
                style={{ width: 120, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: 10, color: "var(--foreground)", fontSize: 14 }}
              />
              <span className="font-mono-data" style={{ color: "var(--gold)", fontWeight: 700 }}>
                = {crashScoreFor(crashMultiplier) === null ? "—" : `${formatPoints(crashScoreFor(crashMultiplier)!)} pts`}
              </span>
            </div>
          </div>
        )}

        {kind === "free" && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 }}>
              Final score
            </label>
            <input
              type="number" min={0} step={1}
              value={freeScore}
              onChange={(e) => setFreeScore(e.target.value)}
              style={{ width: 160, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: 10, color: "var(--foreground)", fontSize: 14 }}
            />
          </div>
        )}

        {error && <div style={{ color: "var(--neon-pink)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="pl-btn ghost" style={{ flex: 1 }} onClick={onClose} disabled={preset.isPending}>Cancel</button>
          <button className="pl-btn" style={{ flex: 2 }} onClick={submit} disabled={preset.isPending || chosenScore === null}>
            {preset.isPending ? "Saving…" : chosenScore === null ? "Pick a result" : `Set result: ${formatPoints(chosenScore)} pts`}
          </button>
        </div>
      </div>
    </div>
  );
}

