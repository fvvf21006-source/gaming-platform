import { useState } from "react";
import { useGames, usePresetNextOutcome } from "../../hooks/useGames";
import { formatPoints } from "../../utils/points";
import OutcomePicker from "./OutcomePicker";

interface Props {
  playerId: string;
  playerName: string;
  onClose: () => void;
  onDone: (message: string) => void;
}

const selectStyle: React.CSSProperties = {
  width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
  padding: 10, color: "var(--foreground)", fontSize: 14, fontFamily: "Outfit, sans-serif", marginBottom: 14,
};

/** Presets the result of a player's NEXT game, before they start it. */
export default function NextOutcomeModal({ playerId, playerName, onClose, onDone }: Props) {
  const { data: gamesData } = useGames(true);
  const games = gamesData?.items ?? [];
  const preset = usePresetNextOutcome();

  const [gameId, setGameId] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState("");

  const game = games.find((g) => g.id === gameId);

  const submit = () => {
    if (score === null || !Number.isInteger(score) || score < 0) {
      setError("Pick a result first.");
      return;
    }
    setError("");
    preset.mutate(
      { playerId, gameId: gameId || undefined, score },
      {
        onSuccess: () => onDone(`Next game set for "${playerName}": ${game?.name ?? "their next game"} will pay ${formatPoints(score)} pts.`),
        onError: (e: Error) => setError(e.message || "Failed to set the next game's outcome"),
      }
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", padding: 16, background: "rgba(5,4,12,.85)", backdropFilter: "blur(8px)", overflowY: "auto" }}>
      <div className="pl-glass pop-in" style={{ width: "min(540px, 100%)", padding: 26, borderRadius: 16, border: "1px solid rgba(255,209,102,0.4)" }}>
        <h3 className="font-cinzel" style={{ fontSize: 17, fontWeight: 700, color: "var(--gold)", margin: 0 }}>🎯 Set Next Game Outcome</h3>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 14px" }}>
          {playerName}'s next game will end on the result you pick, then they play normally again. It is recorded in the audit log.
        </p>

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 }}>Game</label>
        <select
          value={gameId}
          onChange={(e) => { setGameId(e.target.value); setScore(null); }}
          style={selectStyle}
        >
          <option value="">Any game (whichever they start next)</option>
          {games.map((g) => <option key={g.id} value={g.id}>{g.name} · {g.pointCost} pts buy-in</option>)}
        </select>

        {/* Remounted per game so each game starts with its own clean inputs. */}
        <OutcomePicker key={gameId || "any"} gameName={game?.name} pointCost={game?.pointCost ?? 0} value={score} onChange={setScore} />

        {error && <div style={{ color: "var(--neon-pink)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="pl-btn ghost" style={{ flex: 1 }} onClick={onClose} disabled={preset.isPending}>Cancel</button>
          <button className="pl-btn" style={{ flex: 2 }} onClick={submit} disabled={preset.isPending || score === null}>
            {preset.isPending ? "Saving…" : score === null ? "Pick a result" : `Set next game: ${formatPoints(score)} pts`}
          </button>
        </div>
      </div>
    </div>
  );
}
