import { useCallback, useId, useRef, useState } from "react";
import type { Game, GameSession } from "../../api/client";
import { formatPoints } from "../../utils/points";
import { useCompleteGameSession, useGameHistory, usePlayGame } from "../../hooks/useGames";
import { useWallet } from "../../hooks/useWallet";
import ReflexGame from "../game/ReflexGame";
import TargetBlitz from "../game/TargetBlitz";
import NumberChain from "../game/NumberChain";
import LuckyWheel from "../game/LuckyWheel";
import SlotMachine from "../game/SlotMachine";
import MinesGame from "../game/MinesGame";
import CrashGame from "../game/CrashGame";
import { bestScoreFor, themeFor } from "./gameMeta";

/** Owns the whole pick → confirm → play → result flow so Lobby and Arcade share it. */
export function useGameLauncher(games: Game[], onEnter?: () => void) {
  const { data: historyData } = useGameHistory(true);
  const playGame = usePlayGame();
  const startingRef = useRef(false);
  const viewVersion = useRef(0);
  const roundVersion = viewVersion.current;
  const completeSession = useCompleteGameSession();

  const [picked, setPicked] = useState<Game | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [result, setResult] = useState<{ session: GameSession; previousBest: number } | null>(null);
  const [error, setError] = useState("");
  const [stakeInput, setStakeInput] = useState("0.5");
  const stake = stakeInput.trim() === "" ? NaN : Number(stakeInput);
  const setStake = (value: number) => setStakeInput(String(value));
  const [pendingScore, setPendingScore] = useState<number | null>(null);
  const [dismissedResume, setDismissedResume] = useState(false);

  const history = historyData?.items ?? [];
  const latest = history.find((s) => s.status === "in_progress");
  const resumable = !dismissedResume && !session && latest?.status === "in_progress" ? latest : null;

  const gameOf = (s: GameSession | null) =>
    s ? games.find((g) => g.id === s.gameId) ?? ({ id: s.gameId, name: s.gameName ?? "Game", pointCost: s.pointsSpent } as Game) : null;

  const activeGame = gameOf(session);
  const stakeValid = isValidStake(stake, Number(picked?.pointCost ?? activeGame?.pointCost ?? 0.5));

  const startRound = (game: Game, entering: boolean) => {
    if (startingRef.current || !stakeValid) return;
    startingRef.current = true;
    const version = viewVersion.current;
    setError("");
    playGame.mutate({ gameId: game.id, stake }, {
      onSuccess: (nextSession) => {
        if (version !== viewVersion.current) return;
        viewVersion.current += 1;
        setSession(nextSession);
        setPicked(null);
        setResult(null);
        setPendingScore(null);
        if (entering) onEnter?.();
      },
      onError: (err) => {
        if (version === viewVersion.current) setError(err.message);
      },
      onSettled: () => { startingRef.current = false; },
    });
  };

  const quit = useCallback(() => {
    viewVersion.current += 1;
    setSession(null);
    setPicked(null);
    setResult(null);
    setError("");
    setPendingScore(null);
    setDismissedResume(false);
  }, []);

  return {
    history, picked, session, result, error, resumable, stake, setStake, stakeInput, setStakeInput, pendingScore,
    stakeValid, activeGame, quit,
    pick: (g: Game) => { setDismissedResume(false); setError(""); setStake(Number(g.pointCost)); setPicked(g); },
    cancelPick: () => setPicked(null),
    confirm: () => { if (picked) startRound(picked, true); },
    replay: () => { if (result && activeGame) startRound(activeGame, false); },
    starting: playGame.isPending,
    resume: () => {
      if (!resumable) return;
      viewVersion.current += 1;
      setSession(resumable);
      setStake(Number(resumable.pointsSpent));
      setPendingScore(null);
      setError("");
      onEnter?.();
    },
    dismissResume: () => setDismissedResume(true),
    finish: (score: number) => {
      if (!session || result || completeSession.isPending || roundVersion !== viewVersion.current) return;
      setPendingScore(score);
      setError("");
      const previousBest = bestScoreFor(history, session.gameId);
      completeSession.mutate({ sessionId: session.id, score }, {
        onSuccess: (saved) => {
          if (roundVersion !== viewVersion.current) return;
          setResult({ session: saved, previousBest });
          setPendingScore(null);
        },
        onError: (err) => {
          if (roundVersion === viewVersion.current) setError(err.message);
        },
      });
    },
    finishing: completeSession.isPending,
  };
}

export type Launcher = ReturnType<typeof useGameLauncher>;

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", padding: 16,
  background: "rgba(5,4,12,.82)", backdropFilter: "blur(10px)", overflowY: "auto",
};

export default function GameLauncher({ l }: { l: Launcher }) {
  const { data: wallet } = useWallet(true);
  const balance = Number(wallet?.balance ?? 0);

  if (l.session && l.activeGame) {
    return <ActiveRound key={l.session.id} l={l} game={l.activeGame} session={l.session} balance={balance} />;
  }

  // ── Confirm modal ──
  if (l.picked) {
    const g = l.picked;
    const t = themeFor(g.name);
    const afford = balance >= l.stake;
    const best = bestScoreFor(l.history, g.id);
    return (
      <div style={overlay} onClick={() => !l.starting && l.cancelPick()}>
        <div className="pl-glass pop-in" onClick={(e) => e.stopPropagation()} style={{ width: "min(460px, 100%)", overflow: "hidden" }}>
          <div style={{ background: t.gradient, padding: "34px 24px 26px", textAlign: "center", position: "relative" }}>
            <div className="float" style={{ fontSize: 76 }}>{t.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 900, textShadow: "0 2px 12px rgba(0,0,0,.4)" }}>{g.name}</div>
            <div style={{ fontWeight: 600, opacity: 0.9 }}>{t.tagline}</div>
          </div>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ margin: 0, color: "#C9C3D8", fontSize: 14, lineHeight: 1.5 }}>{t.howTo}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Mini label="Entry" value={Number.isFinite(l.stake) ? `${formatPoints(l.stake)} pts` : "—"} color="#FFD166" />
              <Mini label="Your balance" value={formatPoints(balance)} color={afford ? "#3DFF9A" : "#FF2D78"} />
              <Mini label="Your best" value={best ? best.toLocaleString() : "—"} color="#00D4FF" />
            </div>
            <StakeControl value={l.stake} inputValue={l.stakeInput} onInputChange={l.setStakeInput} minimum={Number(g.pointCost)} onChange={l.setStake} disabled={l.starting} />
            {l.stakeValid && !afford && <div style={{ color: "#FF2D78", fontSize: 13, fontWeight: 600 }}>Not enough points — ask your agent to top up your wallet.</div>}
            {l.error && <div style={{ color: "#FF2D78", fontSize: 13, fontWeight: 600 }}>{l.error}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="pl-btn ghost" style={{ flex: 1 }} onClick={l.cancelPick} disabled={l.starting}>Cancel</button>
              <button className="pl-btn" style={{ flex: 2 }} onClick={l.confirm} disabled={!afford || !l.stakeValid || l.starting}>
                {l.starting ? "Starting…" : "▶ Play now"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ActiveRound({ l, game, session, balance }: { l: Launcher; game: Game; session: GameSession; balance: number }) {
  const theme = themeFor(game.name);
  const [flightEnded, setFlightEnded] = useState(false);
  const canStartNext = l.result && (theme.kind !== "crash" || flightEnded);
  const casino = { sessionId: session.id, pointCost: session.pointsSpent, onComplete: l.finish };
  const score = l.result?.session.score ?? 0;
  const record = l.result && score > 0 && score > l.result.previousBest;

  return (
    <div style={{ ...overlay, placeItems: "start center", background: "rgba(7,7,13,.97)" }}>
      <div style={{ width: "min(720px, 100%)", display: "flex", flexDirection: "column", gap: 18 }}>
        <header style={{ position: "sticky", top: 0, zIndex: 1, background: "#0c0b14", borderRadius: 14, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }} aria-hidden="true">{theme.emoji}</span>
            <span style={{ fontWeight: 800, fontSize: 20 }}>{game.name}</span>
          </div>
          <span className="font-mono-data" aria-live="polite" style={{ color: "#FFD166", fontWeight: 800 }}>
            Balance: {formatPoints(balance)} pts
          </span>
        </header>

        <div inert={theme.kind !== "crash" && (l.pendingScore !== null || l.result !== null)}>
          {theme.kind === "wheel" ? <LuckyWheel {...casino} />
          : theme.kind === "slots" ? <SlotMachine {...casino} />
          : theme.kind === "mines" ? <MinesGame {...casino} />
          : theme.kind === "crash" ? <CrashGame {...casino} onFlightEnd={() => setFlightEnded(true)} />
          : theme.kind === "target" ? <TargetBlitz onFinish={l.finish} />
          : theme.kind === "chain" ? <NumberChain onFinish={l.finish} /> : <ReflexGame onFinish={l.finish} />}
        </div>
        {l.finishing && <div role="status" style={{ textAlign: "center" }}>Saving your result…</div>}
        {l.error && <div role="alert" className="pl-glass" style={{ padding: 16 }}>
          <p>{l.error}</p>
          {l.pendingScore !== null && <button className="pl-btn" onClick={() => l.finish(l.pendingScore!)} disabled={l.finishing}>Retry saving result</button>}
        </div>}
        {canStartNext && (
          <section className="pl-glass" style={{ padding: 18, textAlign: "center" }} aria-label="Next round">
            <p style={{ margin: 0, fontWeight: 700 }}>
              {record ? "New personal best · " : ""}{formatPoints(score)} {["wheel", "slots", "mines", "crash"].includes(theme.kind) ? "pts paid out" : "score"}
            </p>
            <StakeControl value={l.stake} inputValue={l.stakeInput} onInputChange={l.setStakeInput} minimum={Number(game.pointCost)} onChange={l.setStake} disabled={l.starting} />
            {l.stakeValid && balance < l.stake && <p>Not enough points for this stake.</p>}
            <button className="pl-btn" style={{ marginTop: 14 }} onClick={l.replay} disabled={l.starting || !l.stakeValid || balance < l.stake}>
              {l.starting ? "Starting…" : "Start next round"}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,.05)", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "#9A94A8", fontWeight: 700 }}>{label}</div>
      <div className="font-mono-data" style={{ fontSize: 16, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function isValidStake(value: number, minimum: number): boolean {
  return Number.isFinite(value) && value >= minimum && value <= 1000000 && Number.isInteger(value * 2);
}

function StakeControl({ value, inputValue, minimum, onChange, onInputChange, disabled }: {
  value: number;
  inputValue: string;
  minimum: number;
  onChange: (value: number) => void;
  onInputChange: (value: string) => void;
  disabled: boolean;
}) {
  const hintId = useId();
  const valid = isValidStake(value, minimum);
  const stepFrom = Number.isFinite(value) ? value : minimum;
  return <div style={{ marginTop: 16 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <button className="pl-btn ghost" style={{ width: 40, padding: "10px 0", flexShrink: 0 }} aria-label="Decrease stake" disabled={disabled || (valid && value <= minimum)} onClick={() => onChange(Math.min(1000000, Math.max(minimum, Math.ceil(stepFrom * 2) / 2 - 0.5)))}>−</button>
      <label style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        Stake:
        <input
          aria-label="Stake points"
          aria-invalid={!valid}
          aria-describedby={valid ? undefined : hintId}
          type="number"
          inputMode="decimal"
          min={minimum}
          max={1000000}
          step={0.5}
          value={inputValue}
          disabled={disabled}
          onChange={(event) => onInputChange(event.target.value)}
          style={{ width: 88, minWidth: 0, padding: "10px 6px", borderRadius: 10, border: `1px solid ${valid ? "rgba(255,209,102,.4)" : "#FF7AA5"}`, background: "rgba(255,255,255,.05)", color: "#FFD166", textAlign: "center", font: "inherit", fontWeight: 800 }}
        />
        pts
      </label>
      <button className="pl-btn ghost" style={{ width: 40, padding: "10px 0", flexShrink: 0 }} aria-label="Increase stake" disabled={disabled || (valid && value >= 1000000)} onClick={() => onChange(Math.max(minimum, Math.min(1000000, Math.floor(stepFrom * 2) / 2 + 0.5)))}>+</button>
    </div>
    {!valid && <div id={hintId} role="alert" style={{ color: "#FF7AA5", fontSize: 12, textAlign: "center", marginTop: 8 }}>Enter {formatPoints(minimum)}–1,000,000 points in steps of 0.5.</div>}
  </div>;
}
