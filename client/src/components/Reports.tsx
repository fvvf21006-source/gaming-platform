import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { AuthUser } from "../api/client";
import { can } from "../utils/permissions";
import { formatPoints } from "../utils/points";
import { exportToCSV, triggerPrintReport } from "../utils/export";
import { usePointDistributionReport, usePlayerActivityReport, useLoginReport } from "../hooks/useReports";
import GameResultsPanel from "./GameResultsPanel";
import { getPointDistributionReport, getPlayerActivityReport, getLoginReport } from "../api/client";

type Tab = "distribution" | "activity" | "login" | "gameResults";
type Bucket = "day" | "week" | "month";

interface Props {
  currentUser: AuthUser;
}

function bucketKey(dateStr: string, bucket: Bucket): string {
  const d = new Date(dateStr);
  if (bucket === "day") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (bucket === "month") return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  const firstOfWeek = new Date(d);
  firstOfWeek.setDate(d.getDate() - d.getDay());
  return `Wk ${firstOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Reports({ currentUser }: Props) {
  const canSeeLogin = can(currentUser.role, "reports.loginReport");
  const canSeeActivity = can(currentUser.role, "reports.playerActivity");
  const canSeeGameResults = can(currentUser.role, "reports.gameResults");
  const [tab, setTab] = useState<Tab>("distribution");
  const [bucket, setBucket] = useState<Bucket>("day");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const distribution = usePointDistributionReport(tab === "distribution", startDate || undefined, endDate || undefined);
  const activity = usePlayerActivityReport(tab === "activity" && canSeeActivity, startDate || undefined, endDate || undefined);
  const login = useLoginReport(tab === "login" && canSeeLogin, startDate || undefined, endDate || undefined);

  const chartData = useMemo(() => {
    if (tab !== "distribution" || !distribution.data) return [];
    const buckets = new Map<string, number>();
    for (const item of distribution.data.items) {
      const key = bucketKey(item.createdAt, bucket);
      buckets.set(key, (buckets.get(key) ?? 0) + Number(item.amount));
    }
    return Array.from(buckets.entries()).map(([label, amount]) => ({ label, amount }));
  }, [distribution.data, tab, bucket]);

  const handleExportCSV = async () => {
    if (tab === "distribution") {
      const csv = await getPointDistributionReport(startDate || undefined, endDate || undefined, "csv");
      downloadText(csv as string, "point_distribution.csv");
    } else if (tab === "activity") {
      const csv = await getPlayerActivityReport(startDate || undefined, endDate || undefined, "csv");
      downloadText(csv as string, "player_activity.csv");
    } else {
      const csv = await getLoginReport(startDate || undefined, endDate || undefined, "csv");
      downloadText(csv as string, "login_report.csv");
    }
  };

  return (
    <div style={{ padding: "26px 30px", display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="font-cinzel" style={{ fontSize: 22, fontWeight: 700, color: "var(--gold)", margin: 0 }}>Reports & Analytics</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>Scoped to your own hierarchy</p>
        </div>
        <div style={{ display: "flex", background: "var(--muted)", borderRadius: 10, padding: 3, gap: 2 }}>
          {([
            ["distribution", "Point Distribution"],
            ...(canSeeActivity ? [["activity", "Player Activity"] as [Tab, string]] : []),
            ...(canSeeLogin ? [["login", "Login Report"] as [Tab, string]] : []),
            ...(canSeeGameResults ? [["gameResults", "Win / Loss"] as [Tab, string]] : []),
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13,
                fontWeight: tab === id ? 700 : 500, fontFamily: "Outfit, sans-serif",
                background: tab === id ? "linear-gradient(135deg, #C9993A, #FFD166)" : "transparent",
                color: tab === id ? "#07070D" : "var(--muted-foreground)",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "gameResults" && canSeeGameResults && <GameResultsPanel />}

      {tab !== "gameResults" && (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={filterLabel()}>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={filterInput()} />
        </div>
        <div>
          <label style={filterLabel()}>End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={filterInput()} />
        </div>
        {tab === "distribution" && (
          <div>
            <label style={filterLabel()}>Chart Bucket</label>
            <select value={bucket} onChange={(e) => setBucket(e.target.value as Bucket)} style={filterInput()}>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
        )}
        <button onClick={handleExportCSV} style={exportBtn()}>Export CSV</button>
        <button onClick={triggerPrintReport} style={exportBtn()}>Export PDF (Print)</button>
      </div>
      )}

      {tab === "distribution" && distribution.data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <SummaryCard label="Total Points Moved" value={formatPoints(distribution.data.summary.totalAmount)} color="var(--gold)" />
            <SummaryCard label="Transactions" value={String(distribution.data.summary.transactionCount)} color="var(--neon-cyan)" />
          </div>
          <div style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.15)", borderRadius: 12, padding: "22px 22px 14px" }}>
            <span className="font-cinzel" style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.05em" }}>Points Moved Over Time</span>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,153,58,0.07)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={{ stroke: "rgba(201,153,58,0.1)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0F0F1A", border: "1px solid rgba(201,153,58,0.3)", borderRadius: 8 }} />
                <Bar dataKey="amount" fill="#C9993A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ReportTable
            columns={["Type", "Sender", "Recipient", "Amount", "Date"]}
            rows={distribution.data.items.map((i) => [
              i.type.replace("_", " "),
              i.senderUsername,
              i.recipientUsername,
              formatPoints(i.amount),
              new Date(i.createdAt).toLocaleString(),
            ])}
          />
        </>
      )}

      {tab === "activity" && canSeeActivity && activity.data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <SummaryCard label="Sessions" value={String(activity.data.summary.sessionCount)} color="var(--neon-cyan)" />
            <SummaryCard label="Points Spent" value={formatPoints(activity.data.summary.totalPointsSpent)} color="var(--gold)" />
            <SummaryCard label="Completed" value={String(activity.data.summary.completed)} color="var(--neon-green)" />
            <SummaryCard label="In Progress / Abandoned" value={`${activity.data.summary.inProgress} / ${activity.data.summary.abandoned}`} color="var(--neon-pink)" />
          </div>
          <ReportTable
            columns={["Player", "Game", "Points Spent", "Score", "Status", "Started"]}
            rows={activity.data.items.map((i) => [
              i.username,
              i.gameName,
              String(i.pointsSpent),
              i.score !== null ? String(i.score) : "—",
              i.status.replace("_", " "),
              new Date(i.startedAt).toLocaleString(),
            ])}
          />
        </>
      )}

      {tab === "login" && canSeeLogin && login.data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <SummaryCard label="Successful Logins" value={String(login.data.summary.successCount)} color="var(--neon-green)" />
            <SummaryCard label="Failed Attempts" value={String(login.data.summary.failureCount)} color="var(--neon-pink)" />
          </div>
          <ReportTable
            columns={["User", "Action", "Reason", "Date"]}
            rows={login.data.items.map((i) => [
              i.username ?? i.attemptedUsername ?? "—",
              i.action.replace("_", " "),
              i.reason ?? "—",
              new Date(i.createdAt).toLocaleString(),
            ])}
          />
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card-glow" style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.15)", borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 8 }}>{label}</div>
      <div className="font-mono-data" style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function ReportTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  const exportRows = () => {
    exportToCSV(rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]]))), "report");
  };
  return (
    <div style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.15)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table className="casino-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((c) => <th key={c} style={{ textAlign: "left" }}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => <td key={j} style={{ fontSize: 13, color: "var(--foreground)" }}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No data for this range.</div>}
      </div>
      {rows.length > 0 && (
        <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(201,153,58,0.08)" }}>
          <button onClick={exportRows} style={{ background: "none", border: "none", color: "var(--neon-cyan)", fontSize: 12, cursor: "pointer" }}>Export this table as CSV</button>
        </div>
      )}
    </div>
  );
}

function filterLabel(): React.CSSProperties {
  return { display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 4 };
}
function filterInput(): React.CSSProperties {
  return { background: "var(--muted)", border: "1px solid rgba(201,153,58,0.2)", borderRadius: 8, padding: "7px 10px", color: "var(--foreground)", fontSize: 13, fontFamily: "Outfit, sans-serif", outline: "none" };
}
function exportBtn(): React.CSSProperties {
  return { border: "1px solid rgba(201,153,58,0.25)", background: "transparent", borderRadius: 6, padding: "8px 12px", color: "var(--gold-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em" };
}
