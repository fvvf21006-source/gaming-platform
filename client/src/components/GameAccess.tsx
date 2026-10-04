import { useEffect, useState } from "react";
import type { AuthUser, Game, GameSession } from "../api/client";
import { formatPoints } from "../utils/points";
import {
  useGames,
  useGameHistory,
  usePlayGame,
  useCompleteGameSession,
  useActiveGameSessions,
  useAlterGameSession,
} from "../hooks/useGames";
import { useWallet } from "../hooks/useWallet";
import ReflexGame from "./game/ReflexGame";

interface Props {
  currentUser: AuthUser;
}

export default function GameAccess({ currentUser }: Props) {
  const isPlayer = currentUser.role === "player";

  if (isPlayer) {
    return <PlayerGameAccess currentUser={currentUser} />;
  }

  return <AdminGameAlterationPanel currentUser={currentUser} />;
}

// ── ADMIN / LEVEL 3 GAME ALTERATION PANEL ──
function AdminGameAlterationPanel({ currentUser }: { currentUser: AuthUser }) {
  const { data: activeData, isLoading, refetch } = useActiveGameSessions(true);
  const alterSession = useAlterGameSession();

  const [selectedSession, setSelectedSession] = useState<GameSession | null>(null);
  const [reason, setReason] = useState("Intervening in active session — forced loss requested by Level 3 agent");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const activeSessions = activeData?.items ?? [];

  const handleOpenAlterModal = (session: GameSession) => {
    setSelectedSession(session);
    setReason(`Forced loss executed for player ${session.playerUsername ?? session.userId.slice(0, 6)}`);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleConfirmAlter = () => {
    if (!selectedSession) return;
    setErrorMessage("");
    alterSession.mutate(
      { sessionId: selectedSession.id, score: 0, reason },
      {
        onSuccess: () => {
          setSuccessMessage(`Game session for player "${selectedSession.playerUsername ?? selectedSession.userId.slice(0, 6)}" was successfully altered to a Forced Loss (Score: 0).`);
          setSelectedSession(null);
          refetch();
        },
        onError: (err: Error) => {
          setErrorMessage(err.message || "Failed to alter game session");
        },
      }
    );
  };

  return (
    <div style={{ padding: "26px 30px", display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 className="font-cinzel" style={{ fontSize: 22, fontWeight: 700, color: "var(--gold)", margin: 0 }}>
              Live Game Control & Intervention
            </h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(255,45,120,0.15)", color: "var(--neon-pink)", border: "1px solid rgba(255,45,120,0.3)" }}>
              {currentUser.role.toUpperCase()} AUTHORIZED
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            Monitor active player game sessions in real-time. If a player is winning and you wish to alter the game, execute a forced loss below.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="pl-btn ghost"
          style={{ padding: "8px 16px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
        >
          <span>🔄</span> Live Polling (3s)
        </button>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div style={{ background: "rgba(61,255,154,0.1)", border: "1px solid rgba(61,255,154,0.3)", borderRadius: 10, padding: "14px 18px", color: "var(--neon-green)", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>✅ {successMessage}</span>
          <button onClick={() => setSuccessMessage("")} style={{ background: "transparent", border: "none", color: "var(--neon-green)", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Summary metric card */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <div style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.18)", borderRadius: 12, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Active Live Sessions</div>
            <div className="font-mono-data" style={{ fontSize: 26, fontWeight: 800, color: "var(--neon-cyan)", marginTop: 4 }}>{activeSessions.length}</div>
          </div>
          <span style={{ fontSize: 28 }}>⚡</span>
        </div>
        <div style={{ background: "var(--card)", border: "1px solid rgba(255,45,120,0.2)", borderRadius: 12, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Intervention Status</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--neon-pink)", marginTop: 6 }}>Ready to Alter</div>
          </div>
          <span style={{ fontSize: 28 }}>🛑</span>
        </div>
      </div>

      {/* Active Sessions List */}
      <div style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.15)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(201,153,58,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--gold)" }}>🎮</span>
            <span className="font-cinzel" style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.05em" }}>
              Active Player Gameplay Sessions
            </span>
          </div>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Auto-refreshing active gameplay</span>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Fetching active player sessions...</div>
        ) : activeSessions.length === 0 ? (
          <div style={{ padding: 50, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 36 }}>🎯</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>No Players Currently Playing</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 400 }}>
              There are currently no active game sessions among your descendant players. When a player starts a game, it will appear live here.
            </div>
          </div>
        ) : (
          <table className="casino-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Player</th>
                <th style={{ textAlign: "left" }}>Game</th>
                <th style={{ textAlign: "right" }}>Buy-In Cost</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "left" }}>Started At</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeSessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--foreground)" }}>{s.playerUsername ?? "Player"}</div>
                    <div className="font-mono-data" style={{ fontSize: 11, color: "var(--muted-foreground)" }}>ID: {s.userId.slice(0, 8)}...</div>
                  </td>
                  <td>
                    <span className="font-cinzel" style={{ fontWeight: 700, color: "var(--gold)" }}>{s.gameName ?? "Arcade Game"}</span>
                  </td>
                  <td className="font-mono-data" style={{ textAlign: "right", color: "var(--gold)", fontWeight: 700 }}>
                    {s.pointsSpent} pts
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--neon-cyan)", background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)", borderRadius: 6, padding: "3px 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      ● IN PROGRESS (ACTIVE)
                    </span>
                  </td>
                  <td style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>
                    {new Date(s.startedAt).toLocaleTimeString()}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleOpenAlterModal(s)}
                      style={{
                        background: "linear-gradient(135deg, #FF2D78, #D81159)",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 14px",
                        color: "#FFF",
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: "Outfit, sans-serif",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(255,45,120,0.3)",
                      }}
                    >
                      ⚡ Force Lose (Alter Game)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Alter Confirmation Modal */}
      {selectedSession && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", padding: 16, background: "rgba(5,4,12,.85)", backdropFilter: "blur(8px)" }}>
          <div className="pl-glass pop-in" style={{ width: "min(480px, 100%)", padding: 28, borderRadius: 16, border: "1px solid rgba(255,45,120,0.4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,45,120,0.15)", border: "1px solid rgba(255,45,120,0.4)", display: "grid", placeItems: "center", fontSize: 22 }}>🛑</div>
              <div>
                <h3 className="font-cinzel" style={{ fontSize: 17, fontWeight: 700, color: "var(--neon-pink)", margin: 0 }}>
                  Confirm Game Alteration
                </h3>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                  Force player session to lose (Score: 0)
                </div>
              </div>
            </div>

            <div style={{ background: "rgba(7,7,13,0.6)", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "var(--muted-foreground)" }}>Target Player: </span>
                <strong style={{ color: "var(--foreground)" }}>{selectedSession.playerUsername ?? selectedSession.userId}</strong>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "var(--muted-foreground)" }}>Game: </span>
                <strong style={{ color: "var(--gold)" }}>{selectedSession.gameName}</strong>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "var(--muted-foreground)" }}>Points Spent: </span>
                <strong style={{ color: "var(--neon-green)" }}>{selectedSession.pointsSpent} pts</strong>
              </div>
            </div>

            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 }}>
              Reason for Game Intervention:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                padding: "10px",
                color: "var(--foreground)",
                fontSize: 13,
                fontFamily: "Outfit, sans-serif",
                resize: "vertical",
                marginBottom: 16,
              }}
            />

            {errorMessage && (
              <div style={{ color: "var(--neon-pink)", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
                {errorMessage}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="pl-btn ghost"
                style={{ flex: 1 }}
                onClick={() => setSelectedSession(null)}
                disabled={alterSession.isPending}
              >
                Cancel
              </button>
              <button
                style={{
                  flex: 2,
                  background: "linear-gradient(135deg, #FF2D78, #D81159)",
                  border: "none",
                  borderRadius: 10,
                  padding: 12,
                  color: "#FFF",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: alterSession.isPending ? "not-allowed" : "pointer",
                }}
                onClick={handleConfirmAlter}
                disabled={alterSession.isPending}
              >
                {alterSession.isPending ? "Executing..." : "Execute Forced Loss"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", maxWidth: 420, margin: "0 auto" }}>
            <h2 className="font-cinzel" style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)", margin: 0 }}>{activeSession.gameName ?? selectedGame?.name}</h2>
            {resumed && (
              <p style={{ fontSize: 12, color: "var(--neon-cyan)", margin: 0, background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 8, padding: "8px 12px" }}>
                You have an unfinished session — {activeSession.pointsSpent} pts already spent. Finish it to record a score.
              </p>
            )}
            <ReflexGame onFinish={handleFinish} />
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
