import type { CSSProperties, ReactNode } from "react";
import type { PlayerOverview } from "../api/client";
import { usePlayerOverview } from "../hooks/useUsers";
import { formatPoints } from "../utils/points";
import { themeFor } from "./player/gameMeta";

export type InsightTab = "results" | "games" | "points" | "activity" | "profile";

const TABS: [InsightTab, string][] = [
  ["results", "Results"],
  ["games", "Games"],
  ["points", "Points"],
  ["activity", "Activity"],
  ["profile", "Profile"],
];

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "-" : ""}${formatPoints(Math.abs(n))}`;
const netColor = (n: number) => (n > 0 ? "var(--neon-green)" : n < 0 ? "var(--neon-pink)" : "var(--muted-foreground)");
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

const TX_LABELS: Record<string, string> = {
  transfer: "Transfer",
  admin_add: "Points added",
  admin_remove: "Points removed",
  admin_set: "Balance set",
  game_buy_in: "Game bet",
  game_payout: "Game payout",
};

/** A plain-language line for an audit-log entry. */
function describeLog(log: PlayerOverview["logs"][number]): { icon: string; text: string } {
  const m = (log.metadata ?? {}) as Record<string, unknown>;
  const by = log.actorUsername ?? "someone";
  const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

  switch (log.action) {
    case "login_success": return { icon: "🔓", text: "Logged in" };
    case "login_failed": return { icon: "⚠️", text: `Failed login${m.reason ? ` (${str(m.reason)})` : ""}` };
    case "game_started": return { icon: "▶️", text: `Started ${str(m.game) || "a game"} — bet ${str(m.cost)} pts` };
    case "game_completed": return { icon: "🏁", text: `Finished a game${m.score !== undefined ? ` — result ${str(m.score)}` : ""}${m.preset ? " (set by a supervisor)" : ""}` };
    case "game_altered": return { icon: "⚡", text: `${by} ended ${str(m.gameName) || "a game"} as a loss${m.reason ? ` — ${str(m.reason)}` : ""}` };
    case "game_outcome_set": return { icon: "🎯", text: `${by} set ${str(m.gameName) || "a game"} to pay ${str(m.forcedScore)} pts` };
    case "game_next_outcome_set": return { icon: "🎯", text: `${by} set the next game (${str(m.gameName) || "any game"}) to ${str(m.score)} pts` };
    case "game_next_outcome_applied": return { icon: "🎯", text: `Next-game result applied to ${str(m.gameName) || "a game"}: ${str(m.forcedScore)} pts` };
    case "game_next_outcome_cleared": return { icon: "↩️", text: `${by} cancelled the next-game result` };
    case "wallet_transfer": return { icon: "💸", text: `${str(m.sender)} sent ${str(m.amount)} pts to ${str(m.recipient)}` };
    case "points_adjusted": return { icon: "◆", text: `${by}: ${str(m.operation)} ${str(m.amount)} pts${m.reason ? ` — ${str(m.reason)}` : ""}` };
    case "password_changed": return { icon: "🔑", text: "Changed their password" };
    case "password_reset": return { icon: "🔑", text: `${by} reset their password` };
    case "user_created": return { icon: "✨", text: `Account created by ${by}` };
    case "user_updated": return { icon: "✎", text: `Profile updated by ${by}` };
    default: return { icon: "•", text: `${log.action.replace(/_/g, " ")} (${by})` };
  }
}

const panel: CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 };

function Stat({ label, value, color, hint }: { label: string; value: string; color: string; hint?: string }) {
  return (
    <div style={{ ...panel, padding: "12px 14px", minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>{label}</div>
      <div className="font-mono-data" style={{ fontSize: 20, fontWeight: 800, color, marginTop: 3, overflowWrap: "anywhere" }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>{hint}</div>}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div style={{ padding: "26px 8px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>{children}</div>;
}

function Row({ children }: { children: ReactNode }) {
  return <div style={{ ...panel, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>{children}</div>;
}

function Results({ o }: { o: PlayerOverview }) {
  const t = o.totals;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <Stat label="Total won" value={formatPoints(t.totalWon)} color="var(--neon-green)" hint="points won above their bets" />
        <Stat label="Total lost" value={formatPoints(t.totalLost)} color="var(--neon-pink)" hint="points lost below their bets" />
        <Stat label="Net result" value={signed(t.net)} color={netColor(t.net)} hint={t.net >= 0 ? "player is ahead" : "player is behind"} />
        <Stat label="Win rate" value={`${t.winRate}%`} color="var(--gold)" hint={`${t.wins} wins · ${t.losses} losses · ${t.rounds} rounds`} />
        <Stat label="Total bet" value={formatPoints(t.boughtIn)} color="var(--foreground)" />
        <Stat label="Paid back" value={formatPoints(t.paidOut)} color="var(--neon-cyan)" />
      </div>

      <div style={{ ...panel, padding: "4px 14px" }}>
        {([
          ["Balance", o.player.balance === null ? "—" : `${formatPoints(o.player.balance)} pts`],
          ["Games in progress", String(t.openRounds)],
          ["Successful logins", String(o.logins.successes)],
          ["Failed logins", String(o.logins.failures)],
          ["Last login", when(o.logins.lastLoginAt)],
          ["Last seen", when(o.player.lastSeenAt)],
          ["Created by", o.player.createdBy ?? "—"],
          ["Joined", when(o.player.createdAt)],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
            <span style={{ color: "var(--muted-foreground)" }}>{k}</span>
            <span style={{ textAlign: "right", fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 8 }}>By game</div>
        {o.byGame.length === 0 ? (
          <Empty>No games played yet.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {o.byGame.map((g) => (
              <Row key={g.gameName}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{themeFor(g.gameName).emoji} {g.gameName}</strong>
                  <span className="font-mono-data" style={{ fontWeight: 800, color: netColor(g.net) }}>{signed(g.net)}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>{g.rounds} rounds</span>
                  <span style={{ color: "var(--neon-green)" }}>won {formatPoints(g.totalWon)}</span>
                  <span style={{ color: "var(--neon-pink)" }}>lost {formatPoints(g.totalLost)}</span>
                  <span>bet {formatPoints(g.boughtIn)}</span>
                </div>
              </Row>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Games({ o }: { o: PlayerOverview }) {
  if (o.sessions.length === 0) return <Empty>No games played yet.</Empty>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {o.sessions.map((s) => {
        const settled = s.status === "completed";
        const result = s.payout - s.pointsSpent;
        return (
          <Row key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <strong>{themeFor(s.gameName).emoji} {s.gameName}</strong>
              <span className="font-mono-data" style={{ fontWeight: 800, color: settled ? netColor(result) : "var(--neon-cyan)" }}>
                {settled ? signed(result) : "In progress"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span>bet {formatPoints(s.pointsSpent)}</span>
              {settled && <span>{s.paysOut ? `won ${formatPoints(s.payout)}` : `score ${s.score === null ? "—" : formatPoints(s.score)}`}</span>}
              {s.isAltered && <span style={{ color: "var(--neon-pink)" }}>forced loss</span>}
              {s.forcedScore !== null && !s.isAltered && <span style={{ color: "var(--neon-cyan)" }}>result set: {formatPoints(s.forcedScore)}</span>}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {when(s.startedAt)}{s.alterationReason ? ` · ${s.alterationReason}` : ""}
            </div>
          </Row>
        );
      })}
      {o.sessions.length >= o.historyLimit && <div style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>Showing the latest {o.historyLimit} games.</div>}
    </div>
  );
}

function Points({ o }: { o: PlayerOverview }) {
  if (o.transactions.length === 0) return <Empty>No point movements yet.</Empty>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {o.transactions.map((t) => (
        <Row key={t.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <strong>{TX_LABELS[t.type] ?? t.type}</strong>
            <span className="font-mono-data" style={{ fontWeight: 800, color: t.direction === "in" ? "var(--neon-green)" : "var(--neon-pink)" }}>
              {t.direction === "in" ? "+" : "-"}{formatPoints(t.amount)}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {t.direction === "in" ? "from" : "to"} {t.counterparty}
            {t.balanceAfter !== null && t.balanceAfter !== undefined ? ` · balance ${formatPoints(t.balanceAfter)}` : ""}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{when(t.createdAt)}</div>
        </Row>
      ))}
      {o.transactions.length >= o.historyLimit && <div style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>Showing the latest {o.historyLimit} movements.</div>}
    </div>
  );
}

function Activity({ o }: { o: PlayerOverview }) {
  if (o.logs.length === 0) return <Empty>No activity recorded yet.</Empty>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {o.logs.map((log) => {
        const { icon, text } = describeLog(log);
        return (
          <Row key={log.id}>
            <div style={{ fontSize: 13 }}><span style={{ marginRight: 6 }}>{icon}</span>{text}</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{when(log.createdAt)}</div>
          </Row>
        );
      })}
      {o.logs.length >= o.historyLimit && <div style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>Showing the latest {o.historyLimit} entries.</div>}
    </div>
  );
}

/** A player's results, game history, point movements and activity log, shown inside the account drawer. */
export default function PlayerInsight({ playerId, tab, onTab, profile }: { playerId: string; tab: InsightTab; onTab: (t: InsightTab) => void; profile: ReactNode }) {
  const { data, isLoading, isError, error } = usePlayerOverview(playerId, true);

  return (
    <div style={{ marginTop: 14 }} aria-live="polite">
      <div role="tablist" aria-label="Player details" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6 }}>
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => onTab(id)}
            style={{
              flex: "1 0 auto", minHeight: 40, padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
              border: `1px solid ${tab === id ? "var(--gold)" : "rgba(255,255,255,0.1)"}`,
              background: tab === id ? "rgba(255,209,102,0.16)" : "rgba(255,255,255,0.04)",
              color: tab === id ? "var(--gold)" : "var(--foreground)", fontWeight: tab === id ? 700 : 500,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        {tab === "profile" ? (
          profile
        ) : isLoading ? (
          <Empty>Loading player details…</Empty>
        ) : isError || !data ? (
          <Empty><span style={{ color: "var(--neon-pink)" }}>{(error as Error | null)?.message ?? "Could not load this player."}</span></Empty>
        ) : tab === "results" ? (
          <Results o={data} />
        ) : tab === "games" ? (
          <Games o={data} />
        ) : tab === "points" ? (
          <Points o={data} />
        ) : (
          <Activity o={data} />
        )}
      </div>
    </div>
  );
}
