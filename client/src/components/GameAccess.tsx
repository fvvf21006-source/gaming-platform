import React, { useEffect, useMemo, useState } from "react";
import type { AuthUser, Game, GameSession } from "../api/client";
import { formatPoints } from "../utils/points";
import {
  useGames,
  useGameHistory,
  usePlayGame,
  useCompleteGameSession,
  useActiveGameSessions,
  useAlterGameSession,
  useNextOutcomes,
  useClearNextOutcome,
  useOnlinePlayers,
} from "../hooks/useGames";
import { useWallet } from "../hooks/useWallet";
import { usePlayerActivityReport } from "../hooks/useReports";
import { useUsers } from "../hooks/useUsers";
import ReflexGame from "./game/ReflexGame";
import LuckyWheel from "./game/LuckyWheel";
import SlotMachine from "./game/SlotMachine";
import MinesGame from "./game/MinesGame";
import CrashGame from "./game/CrashGame";
import PresetOutcomeModal from "./game/PresetOutcomeModal";
import NextOutcomeModal from "./game/NextOutcomeModal";
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

  return <AdminGameAlterationPanel currentUser={currentUser} />;
}

// ── ADMIN / LEVEL 3 GAME ALTERATION & PLAYER ANALYTICS PANEL ──
function AdminGameAlterationPanel({ currentUser }: { currentUser: AuthUser }) {
  const { data: activeData, isLoading: loadingActive, refetch: refetchActive } = useActiveGameSessions(true);
  const { data: activityReport, isLoading: loadingActivity, refetch: refetchActivity } = usePlayerActivityReport(true);
  const { data: usersData } = useUsers();
  const alterSession = useAlterGameSession();
  const { data: nextData } = useNextOutcomes(true);
  const clearNext = useClearNextOutcome();
  const nextByUserId = useMemo(() => new Map((nextData?.items ?? []).map((n) => [n.userId, n])), [nextData]);
  const [nextTarget, setNextTarget] = useState<{ id: string; name: string } | null>(null);
  const { data: onlineData } = useOnlinePlayers(true);
  const onlineIds = useMemo(() => new Set((onlineData?.items ?? []).map((o) => o.id)), [onlineData]);

  const [selectedSession, setSelectedSession] = useState<GameSession | null>(null);
  const [outcomeSession, setOutcomeSession] = useState<GameSession | null>(null);
  const [reason, setReason] = useState("Intervening in active winning session — forced loss executed by Level 3 agent");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const activeSessions = activeData?.items ?? [];
  const allSessions = activityReport?.items ?? [];
  const users = usersData?.items ?? [];

  // Map of active session by userId
  const activeSessionByUserId = useMemo(() => {
    const map = new Map<string, GameSession>();
    for (const s of activeSessions) {
      map.set(s.userId, s);
    }
    return map;
  }, [activeSessions]);

  // Aggregate stats per player (Wins, Losses, Win Rate, Total Spent, Total Won, Net Profit/Loss)
  const playerStatsList = useMemo(() => {
    // Filter descendant players
    const playerUsers = users.filter((u) => u.role === "player");

    // Group sessions by userId
    const sessionsByPlayer = new Map<string, typeof allSessions>();
    for (const s of allSessions) {
      const list = sessionsByPlayer.get(s.userId) ?? [];
      list.push(s);
      sessionsByPlayer.set(s.userId, list);
    }

    return playerUsers.map((player) => {
      const pSessions = sessionsByPlayer.get(player.id) ?? [];
      const liveSession = activeSessionByUserId.get(player.id);

      const totalPlayed = pSessions.length;
      const wins = pSessions.filter((s) => s.status === "completed" && (s.score ?? 0) > 0 && !s.isAltered).length;
      const losses = pSessions.filter((s) => (s.status === "completed" && (s.score === 0 || s.isAltered)) || s.status === "abandoned").length;
      const winRate = totalPlayed > 0 ? ((wins / totalPlayed) * 100).toFixed(1) : "0.0";

      const totalSpent = pSessions.reduce((sum, s) => sum + Number(s.pointsSpent), 0);
      const totalWon = pSessions.reduce((sum, s) => sum + Number(s.score ?? 0), 0);
      const netProfitLoss = totalWon - totalSpent; // Net points win (+) or lose (-)

      return {
        player,
        liveSession,
        totalPlayed,
        wins,
        losses,
        winRate: Number(winRate),
        totalSpent,
        totalWon,
        netProfitLoss,
        sessions: pSessions,
        isOnline: onlineIds.has(player.id),
      };
    }).sort((a, b) => (b.liveSession ? 1 : 0) - (a.liveSession ? 1 : 0) || (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0) || b.netProfitLoss - a.netProfitLoss);
  }, [users, allSessions, activeSessionByUserId, onlineIds]);

  const handleRefetch = () => {
    refetchActive();
    refetchActivity();
  };

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
          setSuccessMessage(`Game session for player "${selectedSession.playerUsername ?? selectedSession.userId.slice(0, 6)}" was forcibly altered to a Loss (Score: 0).`);
          setSelectedSession(null);
          handleRefetch();
        },
        onError: (err: Error) => {
          setErrorMessage(err.message || "Failed to alter game session");
        },
      }
    );
  };

  const totalActiveCount = activeSessions.length;
  const totalNetWinLossAcrossPlayers = playerStatsList.reduce((sum, p) => sum + p.netProfitLoss, 0);

  return (
    <div style={{ padding: "26px 30px", display: "flex", flexDirection: "column", gap: 22, fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 className="font-cinzel" style={{ fontSize: 22, fontWeight: 700, color: "var(--gold)", margin: 0 }}>
              Live Game Control & Player Analytics
            </h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(255,45,120,0.15)", color: "var(--neon-pink)", border: "1px solid rgba(255,45,120,0.3)" }}>
              {currentUser.role.toUpperCase()} CONTROL HUB
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            Monitor player live games, track win/loss rates, total money won or lost, and alter active winning games in real-time.
          </p>
        </div>
        <button
          onClick={handleRefetch}
          className="pl-btn ghost"
          style={{ padding: "8px 16px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
        >
          <span>🔄</span> Live Polling (5s)
        </button>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div style={{ background: "rgba(61,255,154,0.1)", border: "1px solid rgba(61,255,154,0.3)", borderRadius: 10, padding: "14px 18px", color: "var(--neon-green)", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>✅ {successMessage}</span>
          <button onClick={() => setSuccessMessage("")} style={{ background: "transparent", border: "none", color: "var(--neon-green)", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Metrics Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <div style={{ background: "var(--card)", border: "1px solid rgba(61,255,154,0.25)", borderRadius: 12, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Online Players</div>
            <div className="font-mono-data" style={{ fontSize: 26, fontWeight: 800, color: onlineIds.size > 0 ? "var(--neon-green)" : "var(--muted-foreground)", marginTop: 4 }}>
              {onlineIds.size} Online
            </div>
          </div>
          <span style={{ fontSize: 28 }}>🟢</span>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.18)", borderRadius: 12, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Live Playing Now</div>
            <div className="font-mono-data" style={{ fontSize: 26, fontWeight: 800, color: totalActiveCount > 0 ? "var(--neon-cyan)" : "var(--muted-foreground)", marginTop: 4 }}>
              {totalActiveCount} {totalActiveCount === 1 ? "Session" : "Sessions"}
            </div>
          </div>
          <span style={{ fontSize: 28 }}>⚡</span>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.18)", borderRadius: 12, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Managed Players</div>
            <div className="font-mono-data" style={{ fontSize: 26, fontWeight: 800, color: "var(--gold)", marginTop: 4 }}>
              {playerStatsList.length} Players
            </div>
          </div>
          <span style={{ fontSize: 28 }}>👤</span>
        </div>

        <div style={{ background: "var(--card)", border: `1px solid ${totalNetWinLossAcrossPlayers >= 0 ? "rgba(61,255,154,0.25)" : "rgba(255,45,120,0.25)"}`, borderRadius: 12, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Total Net Player Win/Loss</div>
            <div className="font-mono-data" style={{ fontSize: 24, fontWeight: 800, color: totalNetWinLossAcrossPlayers >= 0 ? "var(--neon-green)" : "var(--neon-pink)", marginTop: 4 }}>
              {totalNetWinLossAcrossPlayers >= 0 ? `+${formatPoints(totalNetWinLossAcrossPlayers)} Net Profit` : `-${formatPoints(Math.abs(totalNetWinLossAcrossPlayers))} Net Loss`}
            </div>
          </div>
          <span style={{ fontSize: 28 }}>{totalNetWinLossAcrossPlayers >= 0 ? "📈" : "📉"}</span>
        </div>
      </div>

      {/* Main Player Table & Control Hub */}
      <div style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.15)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(201,153,58,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--gold)" }}>🎮</span>
            <span className="font-cinzel" style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.05em" }}>
              Player Live Games & Win/Loss Analytics
            </span>
          </div>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Live auto-syncing</span>
        </div>

        {loadingActive || loadingActivity ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading player analytics and live session status...</div>
        ) : playerStatsList.length === 0 ? (
          <div style={{ padding: 50, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 36 }}>🎯</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>No Players Found</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 400 }}>
              You currently have no descendant players. Once players join under your hierarchy, their live games and win/loss analytics will appear here.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="casino-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Player</th>
                  <th style={{ textAlign: "left" }}>Live Gameplay</th>
                  <th style={{ textAlign: "center" }}>Wins / Losses</th>
                  <th style={{ textAlign: "center" }}>Win Rate</th>
                  <th style={{ textAlign: "right" }}>Total Spent (Bet)</th>
                  <th style={{ textAlign: "right" }}>Total Won</th>
                  <th style={{ textAlign: "right" }}>Net Win / Loss</th>
                  <th style={{ textAlign: "center" }}>Alter / Action</th>
                </tr>
              </thead>
              <tbody>
                {playerStatsList.map((p) => {
                  const isExpanded = expandedUserId === p.player.id;
                  const isWinning = p.netProfitLoss > 0;
                  return (
                    <React.Fragment key={p.player.id}>
                      <tr style={{ background: p.liveSession ? "rgba(0,212,255,0.04)" : undefined }}>
                        {/* Player */}
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--foreground)", fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
                            <span title={p.isOnline ? "Online now" : "Offline"} style={{ width: 8, height: 8, borderRadius: "50%", background: p.isOnline ? "var(--neon-green)" : "rgba(255,255,255,0.2)", boxShadow: p.isOnline ? "0 0 6px var(--neon-green)" : "none" }} />
                            {p.player.username}
                            {p.isOnline && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--neon-green)" }}>ONLINE</span>}
                          </div>
                          <div className="font-mono-data" style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                            ID: {p.player.id.slice(0, 8)}...
                          </div>
                        </td>

                        {/* Live Gameplay */}
                        <td>
                          {p.liveSession ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--neon-cyan)", background: "rgba(0,212,255,0.14)", border: "1px solid rgba(0,212,255,0.35)", borderRadius: 6, padding: "2px 8px", width: "fit-content", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                ● LIVE: {p.liveSession.gameName ?? "Game"}
                              </span>
                              <span className="font-mono-data" style={{ fontSize: 11, color: "var(--gold)" }}>
                                Buy-in: {p.liveSession.pointsSpent} pts
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                              Idle (No active session)
                            </span>
                          )}
                        </td>

                        {/* Wins / Losses */}
                        <td style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>
                            <span style={{ color: "var(--neon-green)" }}>{p.wins} W</span>
                            <span style={{ color: "var(--muted-foreground)", margin: "0 4px" }}>/</span>
                            <span style={{ color: "var(--neon-pink)" }}>{p.losses} L</span>
                          </div>
                          <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                            {p.totalPlayed} Total Games
                          </div>
                        </td>

                        {/* Win Rate */}
                        <td style={{ textAlign: "center" }}>
                          <span className="font-mono-data" style={{ fontSize: 14, fontWeight: 800, color: p.winRate >= 50 ? "var(--neon-green)" : "var(--gold)" }}>
                            {p.winRate}%
                          </span>
                        </td>

                        {/* Total Spent */}
                        <td className="font-mono-data" style={{ textAlign: "right", color: "var(--muted-foreground)", fontSize: 13 }}>
                          {formatPoints(p.totalSpent)}
                        </td>

                        {/* Total Won */}
                        <td className="font-mono-data" style={{ textAlign: "right", color: "var(--gold)", fontWeight: 700, fontSize: 13 }}>
                          {formatPoints(p.totalWon)}
                        </td>

                        {/* Net Win / Loss */}
                        <td className="font-mono-data" style={{ textAlign: "right", fontWeight: 800, fontSize: 14, color: isWinning ? "var(--neon-green)" : p.netProfitLoss < 0 ? "var(--neon-pink)" : "var(--muted-foreground)" }}>
                          {p.netProfitLoss > 0 ? `+${formatPoints(p.netProfitLoss)}` : p.netProfitLoss < 0 ? `-${formatPoints(Math.abs(p.netProfitLoss))}` : "0"}
                          <div style={{ fontSize: 10, fontWeight: 600, color: isWinning ? "var(--neon-green)" : p.netProfitLoss < 0 ? "var(--neon-pink)" : "var(--muted-foreground)", textTransform: "uppercase" }}>
                            {isWinning ? "Net Win (Profit)" : p.netProfitLoss < 0 ? "Net Loss" : "Even"}
                          </div>
                        </td>

                        {/* Alter Action */}
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            {p.liveSession ? (
                              <>
                              <button
                                onClick={() => { setSuccessMessage(""); setOutcomeSession(p.liveSession!); }}
                                style={{
                                  background: "linear-gradient(135deg, #C9993A, #FFD166)",
                                  border: "none",
                                  borderRadius: 8,
                                  padding: "7px 12px",
                                  color: "#07070D",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  fontFamily: "Outfit, sans-serif",
                                  cursor: "pointer",
                                }}
                              >
                                {p.liveSession.forcedScore != null ? `🎯 Outcome: ${formatPoints(p.liveSession.forcedScore)} pts` : "🎯 Set Outcome"}
                              </button>
                              <button
                                onClick={() => handleOpenAlterModal(p.liveSession!)}
                                style={{
                                  background: "linear-gradient(135deg, #FF2D78, #D81159)",
                                  border: "none",
                                  borderRadius: 8,
                                  padding: "7px 12px",
                                  color: "#FFF",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  fontFamily: "Outfit, sans-serif",
                                  cursor: "pointer",
                                  boxShadow: "0 2px 8px rgba(255,45,120,0.35)",
                                }}
                              >
                                ⚡ Alter Game (Force Lose)
                              </button>
                              </>
                            ) : (
                              <span style={{ fontSize: 11, color: "var(--muted-foreground)", padding: "6px" }}>
                                No live game
                              </span>
                            )}
                            <button
                              onClick={() => { setSuccessMessage(""); setNextTarget({ id: p.player.id, name: p.player.username }); }}
                              style={{
                                background: "rgba(255,209,102,0.12)",
                                border: "1px solid rgba(255,209,102,0.45)",
                                borderRadius: 8,
                                padding: "7px 12px",
                                color: "var(--gold)",
                                fontSize: 12,
                                fontWeight: 700,
                                fontFamily: "Outfit, sans-serif",
                                cursor: "pointer",
                              }}
                            >
                              {nextByUserId.has(p.player.id)
                                ? `🎯 Next: ${formatPoints(nextByUserId.get(p.player.id)!.score)} pts${nextByUserId.get(p.player.id)!.gameName ? ` · ${nextByUserId.get(p.player.id)!.gameName}` : ""}`
                                : "🎯 Next Game"}
                            </button>
                            {nextByUserId.has(p.player.id) && (
                              <button
                                onClick={() => clearNext.mutate(p.player.id)}
                                disabled={clearNext.isPending}
                                title="Cancel the preset for their next game"
                                style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 9px", color: "var(--muted-foreground)", fontSize: 12, cursor: "pointer" }}
                              >
                                ✕
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedUserId(isExpanded ? null : p.player.id)}
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: 8,
                                padding: "7px 10px",
                                color: "var(--foreground)",
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                              title="Toggle Session History Breakdown"
                            >
                              {isExpanded ? "▲ Hide" : "📜 History"}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Gameplay Session History */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} style={{ padding: "16px 24px", background: "rgba(7,7,13,0.7)", borderBottom: "1px solid rgba(201,153,58,0.15)" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                              <span>📜 Gameplay History Breakdown for {p.player.username}</span>
                              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{p.sessions.length} Recorded Sessions</span>
                            </div>
                            {p.sessions.length === 0 ? (
                              <div style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "10px 0" }}>No past game sessions recorded for this player.</div>
                            ) : (
                              <table className="casino-table" style={{ width: "100%", fontSize: 12 }}>
                                <thead>
                                  <tr>
                                    <th style={{ textAlign: "left" }}>Game</th>
                                    <th style={{ textAlign: "center" }}>Status</th>
                                    <th style={{ textAlign: "right" }}>Buy-In Cost</th>
                                    <th style={{ textAlign: "right" }}>Score Won</th>
                                    <th style={{ textAlign: "right" }}>Net Result</th>
                                    <th style={{ textAlign: "left" }}>Started At</th>
                                    <th style={{ textAlign: "left" }}>Notes / Reason</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.sessions.map((s) => {
                                    const netRound = (s.score ?? 0) - s.pointsSpent;
                                    return (
                                      <tr key={s.id}>
                                        <td><span className="font-cinzel" style={{ fontWeight: 700, color: "var(--gold)" }}>{s.gameName}</span></td>
                                        <td style={{ textAlign: "center" }}>
                                          <span style={{ fontSize: 10, fontWeight: 700, color: s.isAltered ? "var(--neon-pink)" : s.status === "completed" ? "var(--neon-green)" : s.status === "in_progress" ? "var(--neon-cyan)" : "var(--neon-pink)", background: s.isAltered ? "rgba(255,45,120,0.15)" : s.status === "completed" ? "rgba(61,255,154,0.1)" : "rgba(0,212,255,0.1)", borderRadius: 4, padding: "2px 6px", textTransform: "uppercase" }}>
                                            {s.isAltered ? "ALTERED (FORCED LOSS)" : s.status.replace("_", " ")}
                                          </span>
                                        </td>
                                        <td className="font-mono-data" style={{ textAlign: "right", color: "var(--muted-foreground)" }}>{s.pointsSpent} pts</td>
                                        <td className="font-mono-data" style={{ textAlign: "right", color: s.isAltered ? "var(--neon-pink)" : "var(--gold)", fontWeight: 700 }}>{s.score !== null ? s.score.toLocaleString() : "—"}</td>
                                        <td className="font-mono-data" style={{ textAlign: "right", fontWeight: 700, color: netRound > 0 ? "var(--neon-green)" : netRound < 0 ? "var(--neon-pink)" : "var(--muted-foreground)" }}>
                                          {netRound > 0 ? `+${netRound}` : netRound}
                                        </td>
                                        <td style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>{new Date(s.startedAt).toLocaleString()}</td>
                                        <td style={{ color: "var(--muted-foreground)", fontStyle: s.alterationReason ? "italic" : undefined }}>
                                          {s.alterationReason || (s.isAltered ? "Altered by Level 3 agent" : "Standard round")}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {nextTarget && (
        <NextOutcomeModal
          playerId={nextTarget.id}
          playerName={nextTarget.name}
          onClose={() => setNextTarget(null)}
          onDone={(message) => {
            setSuccessMessage(message);
            setNextTarget(null);
          }}
        />
      )}

      {outcomeSession && (
        <PresetOutcomeModal
          session={outcomeSession}
          onClose={() => setOutcomeSession(null)}
          onDone={(message) => {
            setSuccessMessage(message);
            setOutcomeSession(null);
            handleRefetch();
          }}
        />
      )}

      {/* Alter Confirmation Modal */}
      {selectedSession && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", padding: 16, background: "rgba(5,4,12,.85)", backdropFilter: "blur(8px)" }}>
          <div className="pl-glass pop-in" style={{ width: "min(480px, 100%)", padding: 28, borderRadius: 16, border: "1px solid rgba(255,45,120,0.4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,45,120,0.15)", border: "1px solid rgba(255,45,120,0.4)", display: "grid", placeItems: "center", fontSize: 22 }}>🛑</div>
              <div>
                <h3 className="font-cinzel" style={{ fontSize: 17, fontWeight: 700, color: "var(--neon-pink)", margin: 0 }}>
                  Confirm Live Game Alteration
                </h3>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                  Force player session to lose immediately (Score: 0)
                </div>
              </div>
            </div>

            <div style={{ background: "rgba(7,7,13,0.6)", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "var(--muted-foreground)" }}>Target Player: </span>
                <strong style={{ color: "var(--foreground)" }}>{selectedSession.playerUsername ?? selectedSession.userId}</strong>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "var(--muted-foreground)" }}>Live Game: </span>
                <strong style={{ color: "var(--gold)" }}>{selectedSession.gameName}</strong>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "var(--muted-foreground)" }}>Buy-In Cost: </span>
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
