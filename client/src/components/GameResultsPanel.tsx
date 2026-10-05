import { useMemo, useState } from "react";
import { getGameResultsReport } from "../api/client";
import { useGameResultsReport } from "../hooks/useReports";
import { formatPoints } from "../utils/points";

type Range = "today" | "week" | "month" | "custom";

interface Span {
  startDate?: string;
  endDate?: string;
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Monday 00:00 of the current week, in the viewer's time zone. */
const startOfWeek = () => {
  const d = startOfToday();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

const startOfMonth = () => {
  const d = startOfToday();
  d.setDate(1);
  return d;
};

// Open-ended: from the start of the period until now, so new rounds keep appearing.
const spanFrom = (start: Date): Span => ({ startDate: start.toISOString() });

/** Custom range from two date inputs, covering the whole of both days. */
function customSpan(from: string, to: string): Span {
  return {
    startDate: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    endDate: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
  };
}

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "-" : ""}${formatPoints(Math.abs(n))}`;
const netColor = (n: number) => (n > 0 ? "var(--neon-green)" : n < 0 ? "var(--neon-pink)" : "var(--muted-foreground)");

export default function GameResultsPanel() {
  const [range, setRange] = useState<Range>("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Re-derived each render so "today" keeps meaning today; the query key only
  // changes when the day (or the chosen custom dates) changes.
  const day = startOfToday().toISOString();
  const todaySpan = useMemo(() => spanFrom(new Date(day)), [day]);
  const weekSpan = useMemo(() => spanFrom(startOfWeek()), [day]);
  const monthSpan = useMemo(() => spanFrom(startOfMonth()), [day]);
  const customRange = useMemo(() => customSpan(from, to), [from, to]);

  const today = useGameResultsReport(true, todaySpan.startDate);
  const week = useGameResultsReport(true, weekSpan.startDate);
  const month = useGameResultsReport(true, monthSpan.startDate);

  const selected: Span = range === "today" ? todaySpan : range === "week" ? weekSpan : range === "month" ? monthSpan : customRange;
  const detail = useGameResultsReport(true, selected.startDate, selected.endDate);

  const exportCsv = async () => {
    const csv = await getGameResultsReport(selected.startDate, selected.endDate, "csv");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `win_loss_${range}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const periods: Array<[string, typeof today]> = [
    ["Today", today],
    ["This week", week],
    ["This month", month],
  ];
  const s = detail.data?.summary;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        {periods.map(([label, q]) => (
          <div key={label} className="card-glow" style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.15)", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 8 }}>{label}</div>
            {q.data ? (
              <>
                <div className="font-mono-data" style={{ fontSize: 22, fontWeight: 700, color: netColor(q.data.summary.houseNet) }}>
                  {signed(q.data.summary.houseNet)}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>house net</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12 }}>
                  <span style={{ color: "var(--neon-pink)" }}>Players lost {formatPoints(q.data.summary.totalLost)}</span>
                  <span style={{ color: "var(--neon-green)" }}>won {formatPoints(q.data.summary.totalWon)}</span>
                </div>
              </>
            ) : (
              <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{q.isError ? "Failed to load" : "Loading…"}</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ display: "flex", background: "var(--muted)", borderRadius: 10, padding: 3, gap: 2 }}>
          {([
            ["today", "Today"],
            ["week", "This week"],
            ["month", "This month"],
            ["custom", "Custom range"],
          ] as [Range, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setRange(id)}
              style={{
                border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13,
                fontWeight: range === id ? 700 : 500, fontFamily: "Outfit, sans-serif",
                background: range === id ? "linear-gradient(135deg, #C9993A, #FFD166)" : "transparent",
                color: range === id ? "#07070D" : "var(--muted-foreground)",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <>
            <div>
              <label style={labelStyle}>From</label>
              <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>To</label>
              <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
            </div>
          </>
        )}
        <button onClick={exportCsv} style={exportStyle}>Export CSV</button>
      </div>

      {detail.isError && <div style={{ color: "var(--neon-pink)", fontSize: 13 }}>Could not load this range.</div>}

      {s && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <Card label="Players lost" value={formatPoints(s.totalLost)} color="var(--neon-pink)" />
            <Card label="Players won" value={formatPoints(s.totalWon)} color="var(--neon-green)" />
            <Card label="House net" value={signed(s.houseNet)} color={netColor(s.houseNet)} />
            <Card label="House wallet" value={formatPoints(s.houseBalance)} color="var(--gold)" />
            <Card label="Bought in" value={formatPoints(s.boughtIn)} color="var(--neon-cyan)" />
            <Card label="Paid out" value={formatPoints(s.paidOut)} color="var(--neon-cyan)" />
            <Card label="Rounds played" value={formatPoints(s.sessions)} color="var(--foreground)" />
          </div>

          <div style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.15)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="casino-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Game", "Rounds", "Bought in", "Paid out", "Players lost", "Players won", "House net"].map((c) => (
                      <th key={c} style={{ textAlign: "left" }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.data!.items.map((i) => (
                    <tr key={i.gameName}>
                      <td style={cell}>{i.gameName}</td>
                      <td style={cell}>{formatPoints(i.sessions)}</td>
                      <td style={cell}>{formatPoints(i.boughtIn)}</td>
                      <td style={cell}>{formatPoints(i.paidOut)}</td>
                      <td style={{ ...cell, color: "var(--neon-pink)" }}>{formatPoints(i.totalLost)}</td>
                      <td style={{ ...cell, color: "var(--neon-green)" }}>{formatPoints(i.totalWon)}</td>
                      <td style={{ ...cell, color: netColor(i.houseNet), fontWeight: 700 }}>{signed(i.houseNet)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {detail.data!.items.length === 0 && (
                <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No finished games in this range.</div>
              )}
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
            Only finished rounds are counted, by the time they finished. What players lose is kept in the house (Super Admin) wallet; casino wins are paid out of it. Arcade buy-ins are always kept.
          </p>
        </>
      )}
    </>
  );
}

const cell: React.CSSProperties = { fontSize: 13, color: "var(--foreground)" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 4 };
const inputStyle: React.CSSProperties = { background: "var(--muted)", border: "1px solid rgba(201,153,58,0.2)", borderRadius: 8, padding: "7px 10px", color: "var(--foreground)", fontSize: 13, fontFamily: "Outfit, sans-serif", outline: "none" };
const exportStyle: React.CSSProperties = { border: "1px solid rgba(201,153,58,0.25)", background: "transparent", borderRadius: 6, padding: "8px 12px", color: "var(--gold-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em" };

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card-glow" style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.15)", borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 8 }}>{label}</div>
      <div className="font-mono-data" style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
