import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AuthUser } from "../api/client";
import type { Role } from "../types/auth";
import { ROLE_COLORS, ROLE_LABELS, ROLE_ORDER } from "../constants/roles";
import { can } from "../utils/permissions";
import { formatPoints } from "../utils/points";
import { useUsers, useUser, useUpdateUser, useUpdateUserStatus } from "../hooks/useUsers";
import { useWallet } from "../hooks/useWallet";
import { useLoginReport, usePlayerActivityReport, usePointDistributionReport } from "../hooks/useReports";

const GOLD = "#FFD166";
const DAY_MS = 86_400_000;

const card: CSSProperties = {
  background: "linear-gradient(180deg, rgba(20,19,34,0.96), rgba(13,13,24,0.96))",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 22,
  padding: 22,
  minWidth: 0,
  boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
};

const rowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" };
const eyebrow: CSSProperties = { fontSize: 12, color: "var(--muted-foreground)" };
const bigNumber: CSSProperties = { fontFamily: "'Outfit',sans-serif", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 };

function Card({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return <div className={`ad-card ${className ?? ""}`} style={{ ...card, ...style }}>{children}</div>;
}

function CardHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
        {sub && <div style={eyebrow}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function Pill({ children, onClick, active }: { children: ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${active ? "rgba(255,209,102,0.5)" : "rgba(255,255,255,0.1)"}`, background: active ? "rgba(255,209,102,0.12)" : "rgba(255,255,255,0.04)",
        color: active ? GOLD : "var(--foreground)", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function Trend({ change }: { change: number | null }) {
  if (change === null) return <span style={eyebrow}>no prior data</span>;
  const up = change >= 0;
  return (
    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
      <b style={{ color: up ? "var(--neon-green)" : "var(--neon-pink)" }}>{up ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%</b> vs previous period
    </span>
  );
}

function pctChange(now: number, before: number): number | null {
  if (before === 0) return now === 0 ? 0 : null;
  return ((now - before) / before) * 100;
}

function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${color}, ${color}66)`, display: "grid", placeItems: "center", fontWeight: 800, color: "#07070D", fontSize: size * 0.4, flexShrink: 0 }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

export default function DashboardHome({ currentUser }: { currentUser: AuthUser }) {
  const navigate = useNavigate();
  const isSuperAdmin = currentUser.role === "super_admin";
  const [range, setRange] = useState<7 | 30>(7);

  const { data: usersData } = useUsers();
  const { data: wallet } = useWallet(!isSuperAdmin);
  const { data: dist } = usePointDistributionReport(true);
  const { data: activity } = usePlayerActivityReport(true);
  const { data: loginReport } = useLoginReport(isSuperAdmin);
  const updateStatus = useUpdateUserStatus();
  const { data: me } = useUser(currentUser.id);
  const updateProfile = useUpdateUser();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const displayName = me?.profile?.displayName?.trim() || currentUser.username;

  const startEditName = () => { setNameDraft(me?.profile?.displayName ?? ""); setNameError(""); setEditingName(true); };
  const saveName = () => {
    const value = nameDraft.trim();
    if (!value) return setNameError("Enter a name");
    if (value.length > 50) return setNameError("Keep it under 50 characters");
    setNameError("");
    updateProfile.mutate(
      { id: currentUser.id, payload: { displayName: value } },
      { onSuccess: () => setEditingName(false), onError: (e: Error) => setNameError(e.message) }
    );
  };

  const users = (usersData?.items ?? []).filter((u) => u.id !== currentUser.id);
  const total = users.length;
  const active = users.filter((u) => u.status === "active").length;
  const frozen = total - active;
  const players = users.filter((u) => u.role === "player").length;

  const roleCounts = ROLE_ORDER.map((role) => ({ role, count: users.filter((u) => u.role === role).length })).filter((r) => r.count > 0);

  // ── Time-bucketed data for the chart and stat column ──
  const { chartData, current, previous } = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const days = Array.from({ length: range }, (_, i) => {
      const d = new Date(startOfToday.getTime() - (range - 1 - i) * DAY_MS);
      return { key: d.toDateString(), label: range === 7 ? d.toLocaleDateString("en-US", { weekday: "short" }) : String(d.getDate()), full: d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }), amount: 0, count: 0, today: i === range - 1 };
    });
    const byKey = new Map(days.map((d) => [d.key, d]));
    const windowStart = startOfToday.getTime() - (range - 1) * DAY_MS;
    let cur = { amount: 0, count: 0, sessions: 0, spent: 0 };
    let prev = { amount: 0, count: 0, sessions: 0, spent: 0 };

    for (const t of dist?.items ?? []) {
      const ts = new Date(t.createdAt).getTime();
      const amt = Number(t.amount);
      if (ts >= windowStart) {
        cur.amount += amt; cur.count++;
        const day = byKey.get(new Date(t.createdAt).toDateString());
        if (day) { day.amount += amt; day.count++; }
      } else if (ts >= windowStart - range * DAY_MS) {
        prev.amount += amt; prev.count++;
      }
    }
    for (const s of activity?.items ?? []) {
      const ts = new Date(s.startedAt).getTime();
      if (ts >= windowStart) { cur.sessions++; cur.spent += s.pointsSpent; }
      else if (ts >= windowStart - range * DAY_MS) { prev.sessions++; prev.spent += s.pointsSpent; }
    }
    return { chartData: days, current: cur, previous: prev };
  }, [dist, activity, range]);

  // Sessions per game → progress rows (the "goal tracker" style card).
  const gameRows = useMemo(() => {
    const map = new Map<string, { sessions: number; spent: number }>();
    for (const s of activity?.items ?? []) {
      const row = map.get(s.gameName) ?? { sessions: 0, spent: 0 };
      row.sessions++; row.spent += s.pointsSpent;
      map.set(s.gameName, row);
    }
    const rows = [...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sessions - a.sessions);
    const max = Math.max(1, ...rows.map((r) => r.sessions));
    return rows.slice(0, 4).map((r) => ({ ...r, pct: (r.sessions / max) * 100 }));
  }, [activity]);

  const recentTransfers = (dist?.items ?? []).slice(0, 6);
  const recentUsers = [...users].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6);

  // Actionable lists
  const frozenUsers = users.filter((u) => u.status === "frozen").slice(0, 4);
  const lastPlayed = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of activity?.items ?? []) map.set(s.userId, Math.max(map.get(s.userId) ?? 0, new Date(s.startedAt).getTime()));
    return map;
  }, [activity]);
  const idlePlayers = users
    .filter((u) => u.role === "player" && u.status === "active")
    .map((u) => ({ user: u, last: lastPlayed.get(u.id) ?? 0 }))
    .filter((p) => Date.now() - p.last > 7 * DAY_MS)
    .sort((a, b) => a.last - b.last)
    .slice(0, 4);
  const attentionEmpty = frozenUsers.length === 0 && idlePlayers.length === 0;
  const unfinished = activity?.summary.inProgress ?? 0;

  const leaderboard = useMemo(() => {
    const map = new Map<string, { name: string; best: number; plays: number }>();
    for (const s of activity?.items ?? []) {
      const row = map.get(s.userId) ?? { name: s.username, best: 0, plays: 0 };
      row.plays++;
      if (s.status === "completed") row.best = Math.max(row.best, s.score ?? 0);
      map.set(s.userId, row);
    }
    return [...map.values()].filter((r) => r.best > 0).sort((a, b) => b.best - a.best).slice(0, 5);
  }, [activity]);

  const failedLogins = (loginReport?.items ?? []).filter((l) => l.action === "login_failed").slice(0, 4);

  const actions = [
    can(currentUser.role, "users.create") && { icon: "＋", label: "Add user", to: "/users" },
    can(currentUser.role, "wallet.transfer") && { icon: "➤", label: "Send", to: "/wallet" },
    can(currentUser.role, "reports.view") && { icon: "▤", label: "Reports", to: "/reports" },
    can(currentUser.role, "audit.view") ? { icon: "◉", label: "Audit", to: "/audit" } : { icon: "☺", label: "Profile", to: "/profile" },
  ].filter(Boolean) as { icon: string; label: string; to: string }[];

  const roleColor = ROLE_COLORS[currentUser.role];

  return (
    <div style={{ padding: "24px 28px 40px", fontFamily: "'Outfit',sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em" }}>Welcome back, {displayName} 👋</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--muted-foreground)" }}>Here&apos;s what&apos;s happening across your hierarchy.</p>
      </div>

      <div className="ad-layout">
        {/* ───────── main column ───────── */}
        <div className="ad-main">
          {/* Chart + stats */}
          <div className="ad-hero">
            <Card style={{ padding: "22px 22px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ ...bigNumber, fontSize: 40, color: GOLD }}>{formatPoints(current.amount)}</div>
                  <div style={eyebrow}>Points distributed · last {range} days</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Pill active={range === 7} onClick={() => setRange(7)}>7d</Pill>
                  <Pill active={range === 30} onClick={() => setRange(30)}>30d</Pill>
                </div>
              </div>
              <div style={{ height: 250, marginTop: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 16, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFD166" />
                        <stop offset="100%" stopColor="#C9993A" />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9A94A8", fontSize: 12 }} interval={range === 30 ? 2 : 0} />
                    <YAxis hide domain={[0, (max: number) => Math.max(10, max * 1.15)]} />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload }) =>
                        active && payload?.[0] ? (
                          <div style={{ background: "#fff", color: "#111", borderRadius: 12, padding: "8px 12px", fontSize: 12, boxShadow: "0 8px 30px rgba(0,0,0,.5)" }}>
                            <div style={{ fontWeight: 700 }}>{payload[0].payload.full}</div>
                            <div>{formatPoints(payload[0].payload.amount)} pts · {payload[0].payload.count} transfer{payload[0].payload.count === 1 ? "" : "s"}</div>
                          </div>
                        ) : null
                      }
                    />
                    <Bar dataKey="amount" radius={[10, 10, 10, 10]} minPointSize={10} maxBarSize={46}>
                      {chartData.map((d) => (
                        <Cell key={d.key} fill={d.today ? "url(#barGold)" : "rgba(255,255,255,0.08)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="ad-stats">
              <StatBlock label="Total accounts" value={String(total)} foot={<span style={eyebrow}>{active} active · {frozen} frozen · {players} players</span>} />
              <StatBlock label="Transfers" value={String(current.count)} foot={<Trend change={pctChange(current.count, previous.count)} />} />
              <StatBlock label="Points spent in games" value={formatPoints(current.spent)} foot={<Trend change={pctChange(current.spent, previous.spent)} />} />
            </div>
          </div>

          {/* Needs attention + leaderboard */}
          <div className="ad-two">
            <Card>
              <CardHeader
                title="Needs attention"
                sub={attentionEmpty ? "Nothing needs you right now" : "Accounts worth a look"}
                right={unfinished > 0 ? <span style={{ fontSize: 11, fontWeight: 700, color: "var(--neon-cyan)", background: "rgba(0,212,255,0.1)", borderRadius: 999, padding: "4px 10px" }}>{unfinished} unfinished game{unfinished > 1 ? "s" : ""}</span> : undefined}
              />
              {attentionEmpty ? (
                <div style={{ textAlign: "center", padding: "26px 0", color: "var(--muted-foreground)", fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>✅</div>All accounts are active and playing.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {frozenUsers.map((u) => (
                    <div key={u.id} style={rowStyle}>
                      <Avatar name={u.username} color={ROLE_COLORS[u.role]} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{u.username}</div>
                        <div style={{ fontSize: 11, color: "var(--neon-pink)" }}>❄ Frozen · {ROLE_LABELS[u.role]}</div>
                      </div>
                      <button className="um-mini" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: u.id, status: "active" })} style={{ color: "var(--neon-green)" }}>▶ Activate</button>
                    </div>
                  ))}
                  {idlePlayers.map(({ user: u, last }) => (
                    <div key={u.id} style={rowStyle}>
                      <Avatar name={u.username} color={ROLE_COLORS.player} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{u.username}</div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{last ? `Last played ${Math.floor((Date.now() - last) / DAY_MS)} days ago` : "Has never played"}</div>
                      </div>
                      {can(currentUser.role, "wallet.transfer") && u.createdBy === currentUser.id && (
                        <button className="um-mini" onClick={() => navigate("/wallet")} style={{ color: GOLD }}>◆ Send points</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Top players" sub="Best single-game score" right={can(currentUser.role, "reports.view") ? <Pill onClick={() => navigate("/reports")}>Reports</Pill> : undefined} />
              {leaderboard.length === 0 ? (
                <div style={{ textAlign: "center", padding: "26px 0", color: "var(--muted-foreground)", fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>🏆</div>No scores yet. The board fills up as players finish games.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {leaderboard.map((r, i) => (
                    <div key={r.name} style={rowStyle}>
                      <div style={{ width: 30, textAlign: "center", fontSize: i < 3 ? 20 : 14, fontWeight: 700, color: "var(--muted-foreground)" }}>{["🥇", "🥈", "🥉"][i] ?? i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{r.plays} game{r.plays > 1 ? "s" : ""} played</div>
                      </div>
                      <div className="font-mono-data" style={{ fontWeight: 700, color: GOLD }}>{r.best.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Three cards */}
          <div className="ad-three">
            <Card>
              <CardHeader title="Accounts by tier" sub="Your hierarchy at a glance" />
              <div style={{ ...bigNumber, fontSize: 30 }}>{total}</div>
              <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden", gap: 2, margin: "12px 0 16px", background: "rgba(255,255,255,0.05)" }}>
                {roleCounts.map((r) => <div key={r.role} title={ROLE_LABELS[r.role]} style={{ flex: r.count, background: ROLE_COLORS[r.role] }} />)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {roleCounts.length === 0 && <div style={eyebrow}>No accounts yet</div>}
                {roleCounts.map((r) => (
                  <div key={r.role} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: ROLE_COLORS[r.role] }} />
                    <span style={{ flex: 1 }}>{ROLE_LABELS[r.role as Role]}</span>
                    <b>{Math.round((r.count / total) * 100)}%</b>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Game activity" sub={`${current.sessions} sessions in ${range} days`} />
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {gameRows.length === 0 && <div style={eyebrow}>No games played yet.</div>}
                {gameRows.map((g, i) => (
                  <div key={g.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{g.name}</span>
                      <span style={{ color: "var(--muted-foreground)" }}>{g.sessions} plays</span>
                    </div>
                    <div style={{ height: 9, borderRadius: 6, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${g.pct}%`, borderRadius: 6, background: ["linear-gradient(90deg,#C9993A,#FFD166)", "linear-gradient(90deg,#00A8CC,#00D4FF)", "linear-gradient(90deg,#B0224E,#FF2D78)", "linear-gradient(90deg,#1FBF6B,#3DFF9A)"][i % 4], transition: "width .8s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ───────── side column ───────── */}
        <div className="ad-side">
          <Card style={{ padding: 20 }}>
            <CardHeader title="My account" sub="Quick actions" />
            <div style={{ borderRadius: 18, padding: 18, background: "linear-gradient(135deg, #C9993A 0%, #FFD166 55%, #FF9F45 100%)", color: "#07070D", position: "relative", overflow: "hidden", minHeight: 150 }}>
              <div style={{ position: "absolute", right: -20, top: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }} />
              <div style={{ position: "relative", display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                <span>{ROLE_LABELS[currentUser.role]}</span><span>👑</span>
              </div>
              <div style={{ position: "relative", ...bigNumber, fontSize: 28, marginTop: 26 }}>
                {isSuperAdmin ? "Unlimited" : `◆ ${formatPoints(wallet?.balance)}`}
              </div>
              {editingName ? (
                <div style={{ position: "relative", marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                      placeholder="Your display name"
                      maxLength={50}
                      aria-label="Display name"
                      style={{ flex: 1, minWidth: 0, background: "rgba(7,7,13,0.85)", color: "#FFD166", border: "1px solid rgba(7,7,13,0.4)", borderRadius: 10, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                    />
                    <button onClick={saveName} disabled={updateProfile.isPending} style={{ background: "#07070D", color: "#FFD166", border: "none", borderRadius: 10, padding: "0 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{updateProfile.isPending ? "…" : "Save"}</button>
                    <button onClick={() => setEditingName(false)} aria-label="Cancel" style={{ background: "rgba(7,7,13,0.15)", color: "#07070D", border: "none", borderRadius: 10, padding: "0 10px", fontWeight: 700, cursor: "pointer" }}>×</button>
                  </div>
                  {nameError && <div style={{ fontSize: 11, fontWeight: 700, color: "#7a0f33", marginTop: 4 }}>{nameError}</div>}
                </div>
              ) : (
                <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>{displayName}</span>
                  <button onClick={startEditName} aria-label="Edit display name" title="Change display name" style={{ background: "rgba(7,7,13,0.15)", border: "none", borderRadius: 8, width: 24, height: 24, cursor: "pointer", fontSize: 12, color: "#07070D" }}>✎</button>
                </div>
              )}
              {displayName !== currentUser.username && !editingName && (
                <div style={{ position: "relative", fontSize: 11, fontWeight: 600, opacity: 0.6, marginTop: 2 }}>Login: {currentUser.username}</div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${actions.length}, 1fr)`, gap: 8, marginTop: 14 }}>
              {actions.map((a) => (
                <button key={a.label} className="ad-action" onClick={() => navigate(a.to)}>
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <span style={{ fontSize: 11 }}>{a.label}</span>
                </button>
              ))}
            </div>
            <div style={{ ...eyebrow, marginTop: 16, marginBottom: 10, fontWeight: 600 }}>Newest accounts</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {recentUsers.length === 0 && <span style={eyebrow}>None yet</span>}
              {recentUsers.map((u) => (
                <button key={u.id} onClick={() => navigate("/users")} title={`${u.username} · ${ROLE_LABELS[u.role]}`} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center", color: "inherit", fontFamily: "inherit" }}>
                  <Avatar name={u.username} color={ROLE_COLORS[u.role]} />
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 4, maxWidth: 48, overflow: "hidden", textOverflow: "ellipsis" }}>{u.username}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card style={{ padding: 20 }}>
            <CardHeader title="Point transfers" sub="Latest movements" right={can(currentUser.role, "reports.view") ? <Pill onClick={() => navigate("/reports")}>All</Pill> : undefined} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentTransfers.length === 0 && <div style={{ ...eyebrow, padding: "14px 0" }}>No transfers yet.</div>}
              {recentTransfers.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <Avatar name={t.recipientUsername} color={roleColor} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.senderUsername} → {t.recipientUsername}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{new Date(t.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--neon-green)" }}>+{formatPoints(t.amount)}</div>
                </div>
              ))}
            </div>
          </Card>

          {isSuperAdmin && loginReport && (
            <Card style={{ padding: 20 }}>
              <CardHeader title="Sign-in security" sub="Platform-wide login attempts" right={<Pill onClick={() => navigate("/reports")}>Details</Pill>} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div style={{ background: "rgba(61,255,154,0.08)", borderRadius: 14, padding: "10px 14px" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--neon-green)" }}>{loginReport.summary.successCount}</div>
                  <div style={eyebrow}>Successful</div>
                </div>
                <div style={{ background: "rgba(255,45,120,0.08)", borderRadius: 14, padding: "10px 14px" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--neon-pink)" }}>{loginReport.summary.failureCount}</div>
                  <div style={eyebrow}>Failed</div>
                </div>
              </div>
              {failedLogins.length === 0 ? (
                <div style={{ ...eyebrow, padding: "6px 0" }}>No failed sign-ins recently. 🎉</div>
              ) : (
                failedLogins.map((l) => (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{l.attemptedUsername ?? l.username ?? "unknown"}</span>
                    <span style={{ color: "var(--muted-foreground)" }}>{new Date(l.createdAt).toLocaleString()}</span>
                  </div>
                ))
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value, foot }: { label: string; value: string; foot: ReactNode }) {
  return (
    <div className="ad-stat">
      <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 6 }}>{label}</div>
      <div style={{ ...bigNumber, fontSize: 34 }}>{value}</div>
      <div style={{ marginTop: 6 }}>{foot}</div>
    </div>
  );
}
