import { useEffect, useState } from "react";
import type { AuthUser, Game, GameSession } from "../api/client";
import { formatPoints } from "../utils/points";
import {
  useGames,
  useGameHistory,
  usePlayGame,
  useCompleteGameSession,
} from "../hooks/useGames";
import { useWallet } from "../hooks/useWallet";
import ReflexGame from "./game/ReflexGame";
import LuckyWheel from "./game/LuckyWheel";
import SlotMachine from "./game/SlotMachine";
import MinesGame from "./game/MinesGame";
import CrashGame from "./game/CrashGame";
import GameControl from "./GameControl";
import NumberChain from "./game/NumberChain";
import TargetBlitz from "./game/TargetBlitz";


interface Props {
  currentUser: AuthUser;
}

export default function GameAccess({ currentUser }: Props) {
  const isPlayer = currentUser.role === "player";

  if (isPlayer) {
    return <PlayerGameAccess currentUser={currentUser} />;
  }

  return <GameControl currentUser={currentUser} />;
}

// ── PLAYER ARCADE VIEW ──
function PlayerGameAccess({}: Props) {
  const { data: gamesData } = useGames(true);
  const { data: wallet } = useWallet(true);
  const { data: historyData } = useGameHistory(true);
  const playGame = usePlayGame();
  const completeSession = useCompleteGameSession();

  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [resumed, setResumed] = useState(false);
  const [lastResult, setLastResult] = useState<GameSession | null>(null);
  const [startError, setStartError] = useState("");

  const games = gamesData?.items ?? [];
  const history = historyData?.items ?? [];
  const selectedGame = games.find((g) => g.id === selectedGameId);
  const balance = Number(wallet?.balance ?? 0);

  useEffect(() => {
    if (!activeSession && history.length > 0 && history[0].status === "in_progress") {
      setActiveSession(history[0]);
      setResumed(true);
    }
  }, [history, activeSession]);

  const wins = history.filter((s) => s.status === "completed" && (s.score ?? 0) > 0).length;
  const totalSpent = history.reduce((sum, s) => sum + s.pointsSpent, 0);
  const totalWon = history.reduce((sum, s) => sum + Number(s.score ?? 0), 0);
  const netResult = totalWon - totalSpent;

  const pickGame = (g: Game) => {
    setStartError("");
    setLastResult(null);
    setSelectedGameId(g.id);
  };

  const handlePlay = () => {
    if (!selectedGame) return;
    setStartError("");
    playGame.mutate(selectedGame.id, {
      onSuccess: (session) => {
        setActiveSession(session);
        setResumed(false);
      },
      onError: (e: Error) => setStartError(e.message),
    });
  };

  const handleFinish = (score: number) => {
    if (!activeSession) return;
    completeSession.mutate(
      { sessionId: activeSession.id, score },
      {
        onSuccess: (session) => {
          setLastResult(session);
          setActiveSession(null);
          setSelectedGameId("");
        },
      }
    );
  };

  const canAfford = (g: Game) => balance >= g.pointCost;

  return (
    <div style={{ padding: "26px 30px", display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 className="font-cinzel" style={{ fontSize: 22, fontWeight: 700, color: "var(--gold)", margin: 0 }}>Game Access</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "3px 0 0" }}>Pick a game, confirm the buy-in, play.</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>Points Balance</div>
          <div className="font-mono-data" style={{ fontSize: 26, fontWeight: 700, color: balance > 0 ? "var(--gold)" : "var(--neon-pink)", lineHeight: 1.2 }}>
            {formatPoints(balance)}
          </div>
        </div>
      </div>

      {/* Slim stats strip */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { label: "Sessions Played", value: history.length.toString(), color: "var(--neon-cyan)" },
          { label: "Scored > 0", value: wins.toString(), color: "var(--neon-green)" },
          { label: "Total Points Spent", value: formatPoints(totalSpent), color: "var(--gold)" },
          { label: "Total Points Won", value: formatPoints(totalWon), color: "var(--neon-green)" },
          { label: "Net Won / Lost", value: `${netResult > 0 ? "+" : ""}${formatPoints(netResult)}`, color: netResult >= 0 ? "var(--neon-green)" : "var(--neon-pink)" },
        ].map((s) => (
          <div key={s.label} style={{ flex: "1 1 160px", background: "var(--card)", border: "1px solid rgba(201,153,58,0.12)", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{s.label}</span>
            <span className="font-mono-data" style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Guided sequence */}
      <div style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.15)", borderRadius: 16, padding: "26px" }}>
        {activeSession ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
            <h2 className="font-cinzel" style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)", margin: 0 }}>{activeSession.gameName ?? selectedGame?.name}</h2>
            {resumed && (
              <p style={{ fontSize: 12, color: "var(--neon-cyan)", margin: 0, background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 8, padding: "8px 12px" }}>
                You have an unfinished session — {activeSession.pointsSpent} pts already spent. Finish it to record a score.
              </p>
            )}
            {(() => {
              const gameName = (activeSession.gameName || selectedGame?.name || "").toLowerCase();
              const cost = activeSession.pointsSpent || selectedGame?.pointCost || 10;

              if (gameName.includes("wheel") || gameName.includes("lucky")) {
                return <LuckyWheel sessionId={activeSession.id} pointCost={cost} onComplete={handleFinish} onCancel={() => setActiveSession(null)} />;
              }
              if (gameName.includes("slot")) {
                return <SlotMachine sessionId={activeSession.id} pointCost={cost} onComplete={handleFinish} onCancel={() => setActiveSession(null)} />;
              }
              if (gameName.includes("mine")) {
                return <MinesGame sessionId={activeSession.id} pointCost={cost} onComplete={handleFinish} onCancel={() => setActiveSession(null)} />;
              }
              if (gameName.includes("crash") || gameName.includes("rocket")) {
                return <CrashGame sessionId={activeSession.id} pointCost={cost} onComplete={handleFinish} onCancel={() => setActiveSession(null)} />;
              }
              if (gameName.includes("target")) {
                return <TargetBlitz onFinish={handleFinish} />;
              }
              if (gameName.includes("number") || gameName.includes("chain")) {
                return <NumberChain onFinish={handleFinish} />;
              }
              return <ReflexGame onFinish={handleFinish} />;
            })()}
          </div>
        ) : selectedGame ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", maxWidth: 380, margin: "0 auto" }}>
            <div style={{ fontSize: 44 }}>♠</div>
            <div>
              <h2 className="font-cinzel" style={{ fontSize: 18, fontWeight: 700, color: "var(--gold)", margin: 0 }}>{selectedGame.name}</h2>
              {selectedGame.description && <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "6px 0 0" }}>{selectedGame.description}</p>}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              Buy-in: <span className="font-mono-data" style={{ color: "var(--gold)", fontWeight: 700 }}>{selectedGame.pointCost} pts</span>
            </div>
            {!canAfford(selectedGame) && (
              <p style={{ color: "var(--neon-pink)", fontSize: 13, margin: 0 }}>Not enough points for this buy-in.</p>
            )}
            {startError && <p style={{ color: "var(--neon-pink)", fontSize: 13, margin: 0 }}>{startError}</p>}
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button
                onClick={() => setSelectedGameId("")}
                style={{ flex: 1, background: "transparent", border: "1px solid rgba(201,153,58,0.25)", borderRadius: 10, padding: "12px", color: "var(--muted-foreground)", fontSize: 13, fontFamily: "Outfit, sans-serif", cursor: "pointer" }}
              >
                Choose a different game
              </button>
              <button
                onClick={handlePlay}
                disabled={playGame.isPending || !canAfford(selectedGame)}
                style={{
                  flex: 1,
                  background: !canAfford(selectedGame) ? "rgba(201,153,58,0.12)" : "linear-gradient(135deg, #C9993A, #FFD166)",
                  border: "none", borderRadius: 10, padding: "12px",
                  color: !canAfford(selectedGame) ? "var(--muted-foreground)" : "#07070D",
                  fontSize: 13, fontWeight: 700, fontFamily: "'Cinzel', serif",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  cursor: !canAfford(selectedGame) ? "not-allowed" : "pointer",
                }}
              >
                {playGame.isPending ? "Starting..." : "Confirm & Play"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {lastResult && (
              <div style={{ maxWidth: 420, margin: "0 auto 20px", background: lastResult.isAltered ? "rgba(255,45,120,0.1)" : "rgba(61,255,154,0.08)", border: `1px solid ${lastResult.isAltered ? "rgba(255,45,120,0.3)" : "rgba(61,255,154,0.3)"}`, borderRadius: 10, padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: lastResult.isAltered ? "var(--neon-pink)" : "var(--neon-green)", marginBottom: 2 }}>
                  {lastResult.isAltered ? "Game Altered by Supervisor (Forced Loss)" : "Session Complete"}
                </div>
                <div className="font-mono-data" style={{ fontSize: 26, fontWeight: 700, color: "var(--foreground)" }}>{(lastResult.score ?? 0).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", letterSpacing: "0.05em" }}>
                  FINAL SCORE · {lastResult.pointsSpent} PTS SPENT {lastResult.alterationReason ? `· ${lastResult.alterationReason}` : ""}
                </div>
              </div>
            )}
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 14, textAlign: "center" }}>
              {games.length === 0 ? "No games available" : "Choose a game"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
              {games.map((g) => (
                <button
                  key={g.id}
                  onClick={() => pickGame(g)}
                  disabled={!canAfford(g)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
                    background: "rgba(7,7,13,0.5)", border: "1px solid rgba(201,153,58,0.18)", borderRadius: 12,
                    padding: "16px", textAlign: "left", cursor: canAfford(g) ? "pointer" : "not-allowed",
                    opacity: canAfford(g) ? 1 : 0.5, transition: "border-color 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 22 }}>♠</span>
                  <span className="font-cinzel" style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>{g.name}</span>
                  {g.description && <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{g.description}</span>}
                  <span className="font-mono-data" style={{ fontSize: 13, color: "var(--gold)", fontWeight: 700, marginTop: 4 }}>{g.pointCost} pts</span>
                  {!canAfford(g) && <span style={{ fontSize: 11, color: "var(--neon-pink)" }}>Insufficient balance</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* History table */}
      <div style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.15)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(201,153,58,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--gold)" }}>♠</span>
          <span className="font-cinzel" style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.05em" }}>Gameplay History</span>
        </div>
        {history.length === 0 ? (
          <div style={{ padding: 36, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No sessions yet. Play your first game!</div>
        ) : (
          <table className="casino-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Session</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "right" }}>Score</th>
                <th style={{ textAlign: "right" }}>Points Spent</th>
                <th style={{ textAlign: "left" }}>Started</th>
                <th style={{ textAlign: "left" }}>Completed</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s, i) => (
                <tr key={s.id}>
                  <td><span className="font-mono-data" style={{ fontSize: 12, color: "var(--muted-foreground)" }}>#{String(history.length - i).padStart(4, "0")}</span></td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.isAltered ? "var(--neon-pink)" : s.status === "completed" ? "var(--neon-green)" : s.status === "in_progress" ? "var(--neon-cyan)" : "var(--neon-pink)", background: s.isAltered ? "rgba(255,45,120,0.15)" : s.status === "completed" ? "rgba(61,255,154,0.1)" : "rgba(0,212,255,0.1)", borderRadius: 4, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {s.isAltered ? "ALTERED (FORCED LOSS)" : s.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="font-mono-data" style={{ textAlign: "right", color: s.isAltered ? "var(--neon-pink)" : "var(--gold)", fontWeight: 600, fontSize: 14 }}>{s.score !== null ? s.score.toLocaleString() : "—"}</td>
                  <td className="font-mono-data" style={{ textAlign: "right", color: "var(--muted-foreground)", fontSize: 13 }}>{s.pointsSpent}</td>
                  <td style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>{new Date(s.startedAt).toLocaleString()}</td>
                  <td style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{s.completedAt ? new Date(s.completedAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
