import { useEffect, useMemo, useState } from "react";
import type { AuthUser, GameSession, PlayerActivityReport } from "../api/client";
import { formatPoints } from "../utils/points";
import {
  useActiveGameSessions,
  useAlterGameSession,
  useClearNextOutcome,
  useNextOutcomes,
  useOnlinePlayers,
} from "../hooks/useGames";
import { usePlayerActivityReport } from "../hooks/useReports";
import { useUsers } from "../hooks/useUsers";
import { outcomeKindFor } from "./game/casinoConfig";
import { themeFor } from "./player/gameMeta";
import PresetOutcomeModal from "./game/PresetOutcomeModal";
import NextOutcomeModal from "./game/NextOutcomeModal";

type Round = PlayerActivityReport["items"][number];
type Filter = "all" | "live" | "online";
type Sort = "activity" | "winners" | "losers" | "name";

interface Props {
  currentUser: AuthUser;
}

/** Only casino games pay their score out as points; an arcade score is just a score. */
const paysOut = (gameName?: string) => outcomeKindFor(gameName) !== "free";
const payoutOf = (r: { gameName?: string; score: number | null }) => (paysOut(r.gameName) ? r.score ?? 0 : 0);

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "-" : ""}${formatPoints(Math.abs(n))}`;
const netColor = (n: number) => (n > 0 ? "var(--neon-green)" : n < 0 ? "var(--neon-pink)" : "var(--muted-foreground)");

const CSS = `
.gc-root { padding: 22px 26px 40px; display: flex; flex-direction: column; gap: 20px; font-family: 'Outfit', sans-serif; }
.gc-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; }
.gc-title { font-size: 22px; font-weight: 700; color: var(--gold); margin: 0; }
.gc-sub { font-size: 13px; color: var(--muted-foreground); margin: 4px 0 0; max-width: 60ch; }
.gc-btn { min-height: 38px; border-radius: 10px; padding: 8px 14px; font-size: 13px; font-weight: 700; font-family: 'Outfit', sans-serif; cursor: pointer; border: 1px solid transparent; display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; }
.gc-btn:disabled { opacity: .55; cursor: not-allowed; }
.gc-btn.gold { background: linear-gradient(135deg, #C9993A, #FFD166); color: #07070D; }
.gc-btn.pink { background: linear-gradient(135deg, #FF2D78, #D81159); color: #fff; box-shadow: 0 2px 8px rgba(255,45,120,.3); }
.gc-btn.soft { background: rgba(255,209,102,.12); border-color: rgba(255,209,102,.45); color: var(--gold); }
.gc-btn.ghost { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14); color: var(--foreground); }
.gc-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.gc-stat { background: var(--card); border: 1px solid rgba(201,153,58,.16); border-radius: 12px; padding: 14px 16px; min-width: 0; }
.gc-stat .k { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--muted-foreground); }
.gc-stat .v { font-size: 24px; font-weight: 800; margin-top: 4px; overflow-wrap: anywhere; }
.gc-stat .n { font-size: 11px; color: var(--muted-foreground); margin-top: 2px; }
.gc-section { background: var(--card); border: 1px solid rgba(201,153,58,.15); border-radius: 14px; overflow: hidden; }
.gc-section-head { padding: 14px 18px; border-bottom: 1px solid rgba(201,153,58,.1); display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.gc-section-title { font-size: 14px; font-weight: 700; color: var(--foreground); letter-spacing: .05em; display: flex; align-items: center; gap: 8px; }
.gc-live-grid { padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; }
.gc-live { border: 1px solid rgba(0,212,255,.3); background: linear-gradient(160deg, rgba(0,212,255,.07), rgba(7,7,13,.4)); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.gc-live .who { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.gc-bet { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; background: rgba(0,0,0,.28); border-radius: 10px; padding: 10px 12px; }
.gc-bet .amt { font-size: 28px; font-weight: 800; color: var(--gold); line-height: 1; }
.gc-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.gc-actions .gc-btn { flex: 1 1 130px; }
.gc-toolbar { padding: 12px 18px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; border-bottom: 1px solid rgba(201,153,58,.1); }
.gc-input, .gc-select { background: var(--muted); border: 1px solid rgba(201,153,58,.2); border-radius: 10px; padding: 9px 12px; color: var(--foreground); font-size: 13px; font-family: 'Outfit', sans-serif; outline: none; min-height: 38px; }
.gc-input { flex: 1 1 200px; min-width: 0; }
.gc-seg { display: inline-flex; background: var(--muted); border-radius: 10px; padding: 3px; gap: 2px; }
.gc-seg button { border: none; border-radius: 8px; padding: 7px 14px; font-size: 13px; font-family: 'Outfit', sans-serif; cursor: pointer; background: transparent; color: var(--muted-foreground); font-weight: 500; min-height: 34px; }
.gc-seg button.on { background: linear-gradient(135deg, #C9993A, #FFD166); color: #07070D; font-weight: 700; }
.gc-cols, .gc-row { display: grid; grid-template-columns: minmax(170px, 1.7fr) minmax(110px, 1fr) minmax(90px, .9fr) minmax(80px, .8fr) minmax(80px, .8fr) minmax(90px, .9fr) minmax(200px, auto); gap: 12px; align-items: center; }
.gc-cols { padding: 10px 18px; font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--muted-foreground); background: rgba(255,255,255,.03); }
.gc-cols .r, .gc-cell.r { text-align: right; }
.gc-cols .c, .gc-cell.c { text-align: center; }
.gc-player { border-bottom: 1px solid rgba(201,153,58,.08); }
.gc-player.live { background: rgba(0,212,255,.04); }
.gc-row { padding: 12px 18px; }
.gc-lbl { display: none; font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 2px; }
.gc-cell .m { font-size: 14px; font-weight: 700; }
.gc-row .acts { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
.gc-hist { padding: 12px 18px 16px; background: rgba(7,7,13,.6); border-top: 1px solid rgba(201,153,58,.1); display: flex; flex-direction: column; gap: 6px; }
.gc-hist-row { display: grid; grid-template-columns: minmax(120px, 1.3fr) minmax(90px, 1fr) minmax(70px, .7fr) minmax(70px, .7fr) minmax(70px, .7fr) minmax(150px, 1.2fr); gap: 10px; align-items: center; font-size: 12px; padding: 7px 10px; border-radius: 8px; background: rgba(255,255,255,.03); }
.gc-pill { font-size: 10px; font-weight: 700; border-radius: 6px; padding: 2px 7px; text-transform: uppercase; letter-spacing: .05em; width: fit-content; }
.gc-empty { padding: 36px 20px; text-align: center; color: var(--muted-foreground); font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.gc-banner { border-radius: 10px; padding: 12px 16px; font-size: 13px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.gc-overlay { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; padding: 16px; background: rgba(5,4,12,.85); backdrop-filter: blur(8px); overflow-y: auto; }

@media (max-width: 1100px) {
  .gc-cols { display: none; }
  .gc-row { grid-template-columns: repeat(3, minmax(0, 1fr)); row-gap: 12px; }
  .gc-row > .gc-cell:first-child { grid-column: 1 / -1; }
  .gc-row > .acts { grid-column: 1 / -1; justify-content: flex-start; }
  .gc-row .acts .gc-btn { flex: 1 1 140px; }
  .gc-lbl { display: block; }
  .gc-cell.r, .gc-cell.c { text-align: left; }
  .gc-hist-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .gc-hist-row > :first-child, .gc-hist-row > :last-child { grid-column: 1 / -1; }
}
@media (max-width: 820px) {
  .gc-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .gc-root { padding: 16px 14px 32px; gap: 16px; }
  .gc-title { font-size: 19px; }
  .gc-live-grid { padding: 12px; grid-template-columns: 1fr; }
  .gc-btn { min-height: 44px; font-size: 14px; }
  .gc-actions .gc-btn, .gc-row .acts .gc-btn { flex: 1 1 100%; }
  .gc-input, .gc-select { min-height: 44px; font-size: 15px; }
  .gc-seg { width: 100%; }
  .gc-seg button { flex: 1; min-height: 40px; padding: 8px 6px; }
  .gc-toolbar > * { flex: 1 1 100%; }
  .gc-stat .v { font-size: 20px; }
  .gc-row { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 14px; }
  .gc-section-head { padding: 12px 14px; }
}
`;

/** "3m 07s" since a session started; ticks every second without re-rendering its parent. */
function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secs = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  return <span className="font-mono-data">{m}m {String(secs % 60).padStart(2, "0")}s</span>;
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span
      title={online ? "Online now" : "Offline"}
      style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: online ? "var(--neon-green)" : "rgba(255,255,255,0.22)", boxShadow: online ? "0 0 6px var(--neon-green)" : "none" }}
    />
  );
}

function StatusPill({ round }: { round: Round }) {
  const altered = round.isAltered;
  const color = altered ? "var(--neon-pink)" : round.status === "completed" ? "var(--neon-green)" : round.status === "in_progress" ? "var(--neon-cyan)" : "var(--neon-pink)";
  const bg = altered ? "rgba(255,45,120,0.15)" : round.status === "completed" ? "rgba(61,255,154,0.1)" : "rgba(0,212,255,0.1)";
  return <span className="gc-pill" style={{ color, background: bg }}>{altered ? "Forced loss" : round.status.replace("_", " ")}</span>;
}

export default function GameControl({ currentUser }: Props) {
  const { data: activeData, isLoading: loadingActive, refetch: refetchActive, dataUpdatedAt } = useActiveGameSessions(true);
  const { data: activityReport, isLoading: loadingActivity, refetch: refetchActivity } = usePlayerActivityReport(true);
  const { data: usersData } = useUsers();
  const { data: onlineData } = useOnlinePlayers(true);
  const { data: nextData } = useNextOutcomes(true);
  const alterSession = useAlterGameSession();
  const clearNext = useClearNextOutcome();

  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("activity");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [outcomeSession, setOutcomeSession] = useState<GameSession | null>(null);
  const [nextTarget, setNextTarget] = useState<{ id: string; name: string } | null>(null);
  const [loseSession, setLoseSession] = useState<GameSession | null>(null);
  const [loseReason, setLoseReason] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(id);
  }, [notice]);

  const onlineIds = useMemo(() => new Set((onlineData?.items ?? []).map((o) => o.id)), [onlineData]);
  const nextByUserId = useMemo(() => new Map((nextData?.items ?? []).map((n) => [n.userId, n])), [nextData]);
  const activeSessions = activeData?.items ?? [];
  const balanceById = useMemo(
    () => new Map((usersData?.items ?? []).map((u) => [u.id, u.balance === null ? null : Number(u.balance)])),
    [usersData]
  );

  // One newest live session per player (the board lists them all; the row shows the latest).
  const liveByUserId = useMemo(() => {
    const map = new Map<string, GameSession>();
    for (const s of [...activeSessions].reverse()) map.set(s.userId, s);
    return map;
  }, [activeSessions]);

  const players = useMemo(() => {
    const rounds = activityReport?.items ?? [];
    const byPlayer = new Map<string, Round[]>();
    for (const r of rounds) byPlayer.set(r.userId, [...(byPlayer.get(r.userId) ?? []), r]);

    return (usersData?.items ?? [])
      .filter((u) => u.role === "player")
      .map((player) => {
        const sessions = byPlayer.get(player.id) ?? [];
        const settled = sessions.filter((s) => s.status === "completed");
        const spent = sessions.reduce((sum, s) => sum + Number(s.pointsSpent), 0);
        const won = settled.reduce((sum, s) => sum + payoutOf(s), 0);
        const wins = settled.filter((s) => payoutOf(s) > s.pointsSpent).length;
        const losses = settled.filter((s) => payoutOf(s) < s.pointsSpent).length;
        return {
          player,
          sessions,
          live: liveByUserId.get(player.id),
          online: onlineIds.has(player.id),
          next: nextByUserId.get(player.id),
          balance: balanceById.get(player.id) ?? null,
          wins,
          losses,
          winRate: settled.length ? Math.round((wins / settled.length) * 100) : 0,
          spent,
          won,
          net: won - spent,
        };
      });
  }, [usersData, activityReport, liveByUserId, onlineIds, nextByUserId, balanceById]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = players.filter((p) => {
      if (q && !p.player.username.toLowerCase().includes(q)) return false;
      if (filter === "live") return Boolean(p.live);
      if (filter === "online") return p.online;
      return true;
    });
    const byName = (a: (typeof list)[number], b: (typeof list)[number]) => a.player.username.localeCompare(b.player.username);
    return list.sort((a, b) => {
      if (sort === "name") return byName(a, b);
      if (sort === "winners") return b.net - a.net || byName(a, b);
      if (sort === "losers") return a.net - b.net || byName(a, b);
      return Number(Boolean(b.live)) - Number(Boolean(a.live)) || Number(b.online) - Number(a.online) || byName(a, b);
    });
  }, [players, filter, sort, query]);

  const pointsInPlay = activeSessions.reduce((sum, s) => sum + Number(s.pointsSpent), 0);
  const totalNet = players.reduce((sum, p) => sum + p.net, 0);
  const refresh = () => { refetchActive(); refetchActivity(); };
  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "…";

  const confirmForceLoss = () => {
    if (!loseSession) return;
    const name = loseSession.playerUsername ?? loseSession.userId.slice(0, 6);
    alterSession.mutate(
      { sessionId: loseSession.id, score: 0, reason: loseReason },
      {
        onSuccess: () => {
          setNotice({ kind: "ok", text: `${name}'s ${loseSession.gameName ?? "game"} was ended as a loss.` });
          setLoseSession(null);
          refresh();
        },
        onError: (err: Error) => setNotice({ kind: "error", text: err.message || "Failed to alter the game." }),
      }
    );
  };

  const openForceLoss = (s: GameSession) => {
    setLoseReason(`Forced loss executed for player ${s.playerUsername ?? s.userId.slice(0, 6)}`);
    setLoseSession(s);
  };

  const loading = loadingActive || loadingActivity;

  return (
    <div className="gc-root">
      <style>{CSS}</style>

      <div className="gc-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="font-cinzel gc-title">Game Control</h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(255,45,120,0.15)", color: "var(--neon-pink)", border: "1px solid rgba(255,45,120,0.3)" }}>
              {currentUser.role === "super_admin" ? "SUPER ADMIN" : "LEVEL 3"}
            </span>
          </div>
          <p className="gc-sub">See who is playing and what they bet, set how a game ends, and review every player's results.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>● Live · updated {updatedAt}</span>
          <button className="gc-btn ghost" onClick={refresh}>🔄 Refresh</button>
        </div>
      </div>

      {notice && (
        <div
          className="gc-banner"
          role="status"
          style={notice.kind === "ok"
            ? { background: "rgba(61,255,154,0.1)", border: "1px solid rgba(61,255,154,0.3)", color: "var(--neon-green)" }
            : { background: "rgba(255,45,120,0.1)", border: "1px solid rgba(255,45,120,0.3)", color: "var(--neon-pink)" }}
        >
          <span>{notice.kind === "ok" ? "✅" : "⚠️"} {notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, fontWeight: 700 }}>✕</button>
        </div>
      )}

      <div className="gc-stats">
        <div className="gc-stat" style={{ borderColor: "rgba(0,212,255,.3)" }}>
          <div className="k">Playing now</div>
          <div className="v font-mono-data" style={{ color: activeSessions.length ? "var(--neon-cyan)" : "var(--muted-foreground)" }}>{activeSessions.length}</div>
          <div className="n">{onlineIds.size} player{onlineIds.size === 1 ? "" : "s"} online</div>
        </div>
        <div className="gc-stat" style={{ borderColor: "rgba(255,209,102,.3)" }}>
          <div className="k">Bet in play</div>
          <div className="v font-mono-data" style={{ color: "var(--gold)" }}>{formatPoints(pointsInPlay)}</div>
          <div className="n">points bet on live games</div>
        </div>
        <div className="gc-stat">
          <div className="k">Players</div>
          <div className="v font-mono-data" style={{ color: "var(--foreground)" }}>{players.length}</div>
          <div className="n">in your hierarchy</div>
        </div>
        <div className="gc-stat" style={{ borderColor: totalNet >= 0 ? "rgba(61,255,154,.25)" : "rgba(255,45,120,.25)" }}>
          <div className="k">Players' net</div>
          <div className="v font-mono-data" style={{ color: netColor(totalNet) }}>{signed(totalNet)}</div>
          <div className="n">{totalNet >= 0 ? "players are ahead" : "players are behind"}</div>
        </div>
      </div>

      {/* Live games board */}
      <section className="gc-section" aria-label="Live games">
        <div className="gc-section-head">
          <div className="gc-section-title"><span style={{ color: "var(--neon-cyan)" }}>⚡</span> Live now <span className="font-mono-data" style={{ color: "var(--neon-cyan)" }}>({activeSessions.length})</span></div>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Set the outcome before the player finishes</span>
        </div>
        {loadingActive ? (
          <div className="gc-empty">Loading live games…</div>
        ) : activeSessions.length === 0 ? (
          <div className="gc-empty">
            <span style={{ fontSize: 30 }}>😴</span>
            <strong style={{ color: "var(--foreground)", fontSize: 14 }}>Nobody is playing right now</strong>
            <span>Use <b>Next Game</b> on a player below to set how their next game will end.</span>
          </div>
        ) : (
          <div className="gc-live-grid">
            {activeSessions.map((s) => {
              const name = s.playerUsername ?? s.userId.slice(0, 6);
              const theme = themeFor(s.gameName);
              const hasOutcome = s.forcedScore != null;
              const balance = balanceById.get(s.userId);
              return (
                <article key={s.id} className="gc-live">
                  <div className="who">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <OnlineDot online={onlineIds.has(s.userId)} />
                      <strong style={{ fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</strong>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>⏱ <Elapsed since={s.startedAt} /></span>
                  </div>
                  <div className="gc-bet">
                    <div>
                      <div className="gc-lbl" style={{ display: "block" }}>Bet</div>
                      <div className="amt font-mono-data">{formatPoints(s.pointsSpent)}<span style={{ fontSize: 13, color: "var(--muted-foreground)", marginLeft: 4 }}>pts</span></div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{theme.emoji} {s.gameName ?? "Game"}</div>
                      {balance != null && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>balance {formatPoints(balance)}</div>}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: hasOutcome ? "var(--neon-cyan)" : "var(--muted-foreground)" }}>
                    {hasOutcome ? `🎯 Result set: ${formatPoints(s.forcedScore)} pts` : "No result set — plays out randomly"}
                  </div>
                  <div className="gc-actions">
                    <button className="gc-btn gold" onClick={() => { setNotice(null); setOutcomeSession(s); }}>
                      🎯 {hasOutcome ? "Change result" : "Set result"}
                    </button>
                    <button className="gc-btn pink" onClick={() => openForceLoss(s)}>⚡ Force loss</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Players */}
      <section className="gc-section" aria-label="Players">
        <div className="gc-section-head">
          <div className="gc-section-title"><span style={{ color: "var(--gold)" }}>🎮</span> Players <span className="font-mono-data" style={{ color: "var(--muted-foreground)" }}>({visible.length}{visible.length !== players.length ? ` of ${players.length}` : ""})</span></div>
        </div>
        <div className="gc-toolbar">
          <input className="gc-input" type="search" placeholder="Search players…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search players" />
          <div className="gc-seg" role="group" aria-label="Filter players">
            {([["all", "All"], ["live", "Live"], ["online", "Online"]] as [Filter, string][]).map(([id, label]) => (
              <button key={id} className={filter === id ? "on" : ""} onClick={() => setFilter(id)}>{label}</button>
            ))}
          </div>
          <select className="gc-select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort players">
            <option value="activity">Sort: Playing first</option>
            <option value="winners">Sort: Biggest winners</option>
            <option value="losers">Sort: Biggest losers</option>
            <option value="name">Sort: Name A–Z</option>
          </select>
        </div>

        {loading ? (
          <div className="gc-empty">Loading players…</div>
        ) : players.length === 0 ? (
          <div className="gc-empty">
            <span style={{ fontSize: 30 }}>🎯</span>
            <strong style={{ color: "var(--foreground)", fontSize: 14 }}>No players yet</strong>
            <span>Players created under you will appear here with their games and results.</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="gc-empty">No players match this search or filter.</div>
        ) : (
          <>
            <div className="gc-cols" aria-hidden="true">
              <div>Player</div>
              <div>Now playing</div>
              <div className="c">Wins / losses</div>
              <div className="r">Bet total</div>
              <div className="r">Won</div>
              <div className="r">Net</div>
              <div className="r">Actions</div>
            </div>
            {visible.map((p) => {
              const expanded = expandedId === p.player.id;
              return (
                <div key={p.player.id} className={`gc-player ${p.live ? "live" : ""}`}>
                  <div className="gc-row">
                    <div className="gc-cell">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15 }}>
                        <OnlineDot online={p.online} />
                        <span style={{ overflowWrap: "anywhere" }}>{p.player.username}</span>
                        {p.player.status === "frozen" && <span className="gc-pill" style={{ color: "var(--neon-cyan)", background: "rgba(0,212,255,.12)" }}>Frozen</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                        Balance <b className="font-mono-data" style={{ color: "var(--gold)" }}>{p.balance === null ? "—" : formatPoints(p.balance)}</b>
                      </div>
                    </div>

                    <div className="gc-cell">
                      <div className="gc-lbl">Now playing</div>
                      {p.live ? (
                        <>
                          <span className="gc-pill" style={{ color: "var(--neon-cyan)", background: "rgba(0,212,255,.14)", border: "1px solid rgba(0,212,255,.35)" }}>● {p.live.gameName ?? "Game"}</span>
                          <div className="font-mono-data" style={{ fontSize: 12, color: "var(--gold)", marginTop: 3 }}>Bet {formatPoints(p.live.pointsSpent)} pts</div>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic" }}>Idle</span>
                      )}
                    </div>

                    <div className="gc-cell c">
                      <div className="gc-lbl">Wins / losses</div>
                      <div className="m"><span style={{ color: "var(--neon-green)" }}>{p.wins}W</span> <span style={{ color: "var(--muted-foreground)" }}>/</span> <span style={{ color: "var(--neon-pink)" }}>{p.losses}L</span></div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{p.winRate}% win rate</div>
                    </div>

                    <div className="gc-cell r">
                      <div className="gc-lbl">Bet total</div>
                      <div className="m font-mono-data" style={{ color: "var(--muted-foreground)" }}>{formatPoints(p.spent)}</div>
                    </div>

                    <div className="gc-cell r">
                      <div className="gc-lbl">Won</div>
                      <div className="m font-mono-data" style={{ color: "var(--gold)" }}>{formatPoints(p.won)}</div>
                    </div>

                    <div className="gc-cell r">
                      <div className="gc-lbl">Net</div>
                      <div className="m font-mono-data" style={{ color: netColor(p.net) }}>{signed(p.net)}</div>
                    </div>

                    <div className="acts">
                      <button className="gc-btn soft" onClick={() => { setNotice(null); setNextTarget({ id: p.player.id, name: p.player.username }); }}>
                        {p.next ? `🎯 Next: ${formatPoints(p.next.score)} pts${p.next.gameName ? ` · ${p.next.gameName}` : ""}` : "🎯 Next game"}
                      </button>
                      {p.next && (
                        <button className="gc-btn ghost" onClick={() => clearNext.mutate(p.player.id)} disabled={clearNext.isPending} title="Cancel the result set for their next game" aria-label="Cancel next game result">✕</button>
                      )}
                      <button className="gc-btn ghost" onClick={() => setExpandedId(expanded ? null : p.player.id)} aria-expanded={expanded}>
                        {expanded ? "▲ Hide" : "📜 History"}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="gc-hist">
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "var(--gold)", gap: 8, flexWrap: "wrap" }}>
                        <span>📜 {p.player.username}'s games</span>
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>{p.sessions.length} recorded</span>
                      </div>
                      {p.sessions.length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "8px 0" }}>No games played yet.</div>
                      ) : (
                        p.sessions.slice(0, 50).map((s) => {
                          const result = payoutOf(s) - s.pointsSpent;
                          const settled = s.status === "completed";
                          return (
                            <div key={s.id} className="gc-hist-row">
                              <span className="font-cinzel" style={{ fontWeight: 700, color: "var(--gold)" }}>{themeFor(s.gameName).emoji} {s.gameName}</span>
                              <StatusPill round={s} />
                              <span><span className="gc-lbl">Bet</span><span className="font-mono-data">{formatPoints(s.pointsSpent)}</span></span>
                              <span><span className="gc-lbl">{paysOut(s.gameName) ? "Won" : "Score"}</span><span className="font-mono-data" style={{ color: "var(--gold)", fontWeight: 700 }}>{s.score !== null ? formatPoints(s.score) : "—"}</span></span>
                              <span><span className="gc-lbl">Result</span><span className="font-mono-data" style={{ fontWeight: 700, color: settled ? netColor(result) : "var(--muted-foreground)" }}>{settled ? signed(result) : "—"}</span></span>
                              <span style={{ color: "var(--muted-foreground)" }}>{new Date(s.startedAt).toLocaleString()}{s.alterationReason ? ` · ${s.alterationReason}` : ""}</span>
                            </div>
                          );
                        })
                      )}
                      {p.sessions.length > 50 && <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Showing the latest 50.</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </section>

      {outcomeSession && (
        <PresetOutcomeModal
          session={outcomeSession}
          onClose={() => setOutcomeSession(null)}
          onDone={(text) => { setNotice({ kind: "ok", text }); setOutcomeSession(null); refresh(); }}
        />
      )}

      {nextTarget && (
        <NextOutcomeModal
          playerId={nextTarget.id}
          playerName={nextTarget.name}
          onClose={() => setNextTarget(null)}
          onDone={(text) => { setNotice({ kind: "ok", text }); setNextTarget(null); }}
        />
      )}

      {loseSession && (
        <div className="gc-overlay">
          <div className="pl-glass pop-in" style={{ width: "min(480px, 100%)", padding: 24, borderRadius: 16, border: "1px solid rgba(255,45,120,0.4)" }}>
            <h3 className="font-cinzel" style={{ fontSize: 17, fontWeight: 700, color: "var(--neon-pink)", margin: "0 0 4px" }}>⚡ Force this game to a loss?</h3>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 14px" }}>The round ends now with nothing paid out. This can't be undone.</p>
            <div style={{ background: "rgba(7,7,13,0.6)", borderRadius: 10, padding: 12, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 14, display: "grid", gap: 6, fontSize: 13 }}>
              <div><span style={{ color: "var(--muted-foreground)" }}>Player </span><strong>{loseSession.playerUsername ?? loseSession.userId}</strong></div>
              <div><span style={{ color: "var(--muted-foreground)" }}>Game </span><strong style={{ color: "var(--gold)" }}>{loseSession.gameName}</strong></div>
              <div><span style={{ color: "var(--muted-foreground)" }}>Bet </span><strong style={{ color: "var(--neon-green)" }}>{formatPoints(loseSession.pointsSpent)} pts</strong></div>
            </div>
            <label htmlFor="gc-lose-reason" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 }}>Reason (kept in the audit log)</label>
            <textarea
              id="gc-lose-reason"
              rows={3}
              value={loseReason}
              onChange={(e) => setLoseReason(e.target.value)}
              style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: 10, color: "var(--foreground)", fontSize: 13, fontFamily: "Outfit, sans-serif", resize: "vertical", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="gc-btn ghost" style={{ flex: "1 1 120px" }} onClick={() => setLoseSession(null)} disabled={alterSession.isPending}>Cancel</button>
              <button className="gc-btn pink" style={{ flex: "2 1 180px" }} onClick={confirmForceLoss} disabled={alterSession.isPending}>
                {alterSession.isPending ? "Ending…" : "Force loss"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
