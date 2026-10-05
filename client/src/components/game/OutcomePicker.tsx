import { useMemo, useState } from "react";
import { formatPoints } from "../../utils/points";
import { MAX_MULTIPLIER, discreteMultipliers, outcomeKindFor, payoutFor } from "./casinoConfig";

interface Props {
  /** The game the result is for, or undefined for "any game". */
  gameName?: string;
  pointCost: number;
  value: number | null;
  onChange: (score: number | null) => void;
}

interface Choice {
  key: string;
  label: string;
  hint: string;
  score: number;
}

/** The results a game can end on, one chip each; results that pay the same are merged. */
function choicesFor(gameName: string | undefined, pointCost: number): Choice[] | null {
  const kind = outcomeKindFor(gameName);
  const multipliers = discreteMultipliers(kind);
  if (!multipliers) return null;

  const seen = new Set<number>();
  const choices: Choice[] = [];
  multipliers.forEach((m, i) => {
    const score = payoutFor(pointCost, m);
    if (seen.has(score)) return;
    seen.add(score);
    const hint = kind === "mines" && m > 0 ? `${i} safe tile${i === 1 ? "" : "s"}` : m === 0 ? "pays nothing" : "";
    choices.push({ key: `${i}`, label: m === 0 ? "Lose" : `${m}x`, hint, score });
  });
  return choices;
}

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

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: 140, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: 10, color: "var(--foreground)", fontSize: 14 };

/** Lets a supervisor pick the points a game should pay: chips for fixed-result games, a multiplier for Crash, a plain score otherwise. */
export default function OutcomePicker({ gameName, pointCost, value, onChange }: Props) {
  const kind = gameName ? outcomeKindFor(gameName) : "free";
  const choices = useMemo(() => (gameName ? choicesFor(gameName, pointCost) : null), [gameName, pointCost]);
  const [crashMultiplier, setCrashMultiplier] = useState("2.00");
  const [freeScore, setFreeScore] = useState(value === null ? "" : String(value));

  const crashScoreFor = (raw: string) => {
    const m = Number(raw);
    if (!Number.isFinite(m) || m < 1 || m > MAX_MULTIPLIER.crash) return null;
    return payoutFor(pointCost, m);
  };

  if (choices) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 8, maxHeight: 260, overflowY: "auto", marginBottom: 14 }}>
        {choices.map((c) => (
          <button key={c.key} type="button" style={chip(value === c.score)} onClick={() => onChange(c.score)}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{c.label}</div>
            <div className="font-mono-data" style={{ fontSize: 12, color: "var(--gold)" }}>{formatPoints(c.score)} pts</div>
            {c.hint && <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{c.hint}</div>}
          </button>
        ))}
      </div>
    );
  }

  if (kind === "crash") {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <button type="button" style={chip(value === 0)} onClick={() => onChange(0)}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Crash at 1.00x</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>pays nothing</div>
          </button>
          <button type="button" style={chip(value !== null && value > 0)} onClick={() => onChange(crashScoreFor(crashMultiplier))}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Cash out at a multiplier</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>rocket flies to it</div>
          </button>
        </div>
        <label style={labelStyle}>Multiplier (1.00 – {MAX_MULTIPLIER.crash}x)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="number" min={1} max={MAX_MULTIPLIER.crash} step={0.01}
            value={crashMultiplier}
            onChange={(e) => { setCrashMultiplier(e.target.value); onChange(crashScoreFor(e.target.value)); }}
            style={inputStyle}
          />
          <span className="font-mono-data" style={{ color: "var(--gold)", fontWeight: 700 }}>
            = {crashScoreFor(crashMultiplier) === null ? "—" : `${formatPoints(crashScoreFor(crashMultiplier)!)} pts`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{gameName ? "Final score" : "Points the next game should pay"}</label>
      <input
        type="number" min={0} step={1}
        value={freeScore}
        onChange={(e) => {
          setFreeScore(e.target.value);
          onChange(e.target.value.trim() === "" ? null : Number(e.target.value));
        }}
        style={inputStyle}
      />
      {!gameName && (
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>
          Applies to whichever game they start next. Casino games use the closest result they can show (for example 47 becomes 50 on the wheel).
        </div>
      )}
    </div>
  );
}
