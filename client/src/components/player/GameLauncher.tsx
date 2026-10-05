import { useState } from "react";
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
import Confetti from "./Confetti";
import { bestScoreFor, themeFor } from "./gameMeta";

/** Owns the whole pick → confirm → play → result flow so Lobby and Arcade share it. */
export function useGameLauncher(games: Game[]) {
  const { data: historyData } = useGameHistory(true);
  const playGame = usePlayGame();
  const completeSession = useCompleteGameSession();

  const [picked, setPicked] = useState<Game | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [result, setResult] = useState<{ session: GameSession; previousBest: number } | null>(null);
  const [error, setError] = useState("");
  const [dismissedResume, setDismissedResume] = useState(false);

  const history = historyData?.items ?? [];
  const latest = history[0];
  const resumable = !dismissedResume && !session && latest?.status === "in_progress" ? latest : null;

  const gameOf = (s: GameSession | null) =>
    s ? games.find((g) => g.id === s.gameId) ?? ({ id: s.gameId, name: s.gameName ?? "Game", pointCost: s.pointsSpent } as Game) : null;

  return {
    history, picked, session, result, error, resumable,
    activeGame: gameOf(session),
    pick: (g: Game) => { setError(""); setPicked(g); },
    cancelPick: () => setPicked(null),
    confirm: () => {
      if (!picked) return;
      setError("");
      playGame.mutate(picked.id, {
        onSuccess: (s) => { setSession(s); setPicked(null); },
        onError: (e: Error) => setError(e.message),
      });
    },
    starting: playGame.isPending,
    resume: () => { if (resumable) setSession(resumable); },
    dismissResume: () => setDismissedResume(true),
    quit: () => { setSession(null); setDismissedResume(true); },
    finish: (score: number) => {
      if (!session) return;
      const previousBest = bestScoreFor(history, session.gameId);
      completeSession.mutate(
        { sessionId: session.id, score },
        { onSuccess: (s) => { setResult({ session: { ...s, gameName: s.gameName ?? session.gameName }, previousBest }); setSession(null); } }
      );
    },
    finishing: completeSession.isPending,
    closeResult: () => setResult(null),
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

  // ── Result screen ──
  if (l.result) {
    const { session, previousBest } = l.result;
    const score = session.score ?? 0;
    const record = score > 0 && score > previousBest;
    const t = themeFor(session.gameName);
    return (
      <div style={overlay}>
        {score > 0 && <Confetti count={record ? 110 : 60} />}
        <div className="pl-glass pop-in" style={{ width: "min(440px, 100%)", padding: "34px 28px", textAlign: "center", borderColor: "rgba(255,209,102,.35)" }}>
          <div style={{ fontSize: 64 }} className="float">{record ? "🏆" : score > 0 ? t.emoji : "😅"}</div>
          <div style={{ fontSize: 13, letterSpacing: ".2em", color: record ? "#FFD166" : "#9A94A8", fontWeight: 800, marginTop: 6 }}>
            {record ? "NEW PERSONAL BEST!" : score > 0 ? "NICE RUN" : "BETTER LUCK NEXT TIME"}
          </div>
          <div className="font-mono-data shine" style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.1, margin: "8px 0", backgroundImage: "linear-gradient(90deg,#FFD166,#fff,#FFD166)", WebkitBackgroundClip: "text", color: "transparent" }}>
            {score.toLocaleString()}
          </div>
          <div style={{ color: "#9A94A8", fontSize: 14 }}>{session.gameName} · {session.pointsSpent} pts spent</div>
          {previousBest > 0 && !record && <div style={{ color: "#9A94A8", fontSize: 13, marginTop: 4 }}>Your best: <b style={{ color: "#FFD166" }}>{previousBest.toLocaleString()}</b></div>}
          <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
            <button className="pl-btn ghost" style={{ flex: 1 }} onClick={l.closeResult}>Back to lobby</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Live game ──
  if (l.session && l.activeGame) {
    const t = themeFor(l.activeGame.name);
    const props = { onFinish: l.finish };
    const casino = { pointCost: l.session.pointsSpent, onComplete: l.finish, onCancel: l.quit };
    return (
      <div style={{ ...overlay, placeItems: "start center", background: "rgba(7,7,13,.97)" }}>
        <div style={{ width: "min(720px, 100%)", display: "flex", flexDirection: "column", gap: 18, paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: t.gradient, display: "grid", placeItems: "center", fontSize: 24 }}>{t.emoji}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{l.activeGame.name}</div>
                <div style={{ fontSize: 12, color: "#9A94A8" }}>{t.tagline}</div>
              </div>
            </div>
            <button className="pl-btn ghost" style={{ padding: "10px 16px", fontSize: 13 }} onClick={l.quit}>Exit</button>
          </div>
          {l.finishing ? (
            <div className="pl-glass" style={{ padding: 60, textAlign: "center", fontSize: 18, fontWeight: 700 }}>Saving your score…</div>
          ) : t.kind === "wheel" ? <LuckyWheel {...casino} />
          : t.kind === "slots" ? <SlotMachine {...casino} />
          : t.kind === "mines" ? <MinesGame {...casino} />
          : t.kind === "crash" ? <CrashGame {...casino} />
          : t.kind === "target" ? <TargetBlitz {...props} /> : t.kind === "chain" ? <NumberChain {...props} /> : <ReflexGame {...props} />}
          <p style={{ textAlign: "center", fontSize: 12, color: "#7d778f", margin: 0 }}>
            Exiting now keeps this round open — you can pick it back up from the lobby.
          </p>
        </div>
      </div>
    );
  }

  // ── Confirm modal ──
  if (l.picked) {
    const g = l.picked;
    const t = themeFor(g.name);
    const afford = balance >= g.pointCost;
    const best = bestScoreFor(l.history, g.id);
    return (
      <div style={overlay} onClick={l.cancelPick}>
        <div className="pl-glass pop-in" onClick={(e) => e.stopPropagation()} style={{ width: "min(460px, 100%)", overflow: "hidden" }}>
          <div style={{ background: t.gradient, padding: "34px 24px 26px", textAlign: "center", position: "relative" }}>
            <div className="float" style={{ fontSize: 76 }}>{t.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 900, textShadow: "0 2px 12px rgba(0,0,0,.4)" }}>{g.name}</div>
            <div style={{ fontWeight: 600, opacity: 0.9 }}>{t.tagline}</div>
          </div>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ margin: 0, color: "#C9C3D8", fontSize: 14, lineHeight: 1.5 }}>{t.howTo}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Mini label="Entry" value={`${g.pointCost} pts`} color="#FFD166" />
              <Mini label="Your balance" value={formatPoints(balance)} color={afford ? "#3DFF9A" : "#FF2D78"} />
              <Mini label="Your best" value={best ? best.toLocaleString() : "—"} color="#00D4FF" />
            </div>
            {!afford && <div style={{ color: "#FF2D78", fontSize: 13, fontWeight: 600 }}>Not enough points — ask your agent to top up your wallet.</div>}
            {l.error && <div style={{ color: "#FF2D78", fontSize: 13, fontWeight: 600 }}>{l.error}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="pl-btn ghost" style={{ flex: 1 }} onClick={l.cancelPick}>Cancel</button>
              <button className="pl-btn" style={{ flex: 2 }} onClick={l.confirm} disabled={!afford || l.starting}>
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

function Mini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,.05)", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "#9A94A8", fontWeight: 700 }}>{label}</div>
      <div className="font-mono-data" style={{ fontSize: 16, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}
