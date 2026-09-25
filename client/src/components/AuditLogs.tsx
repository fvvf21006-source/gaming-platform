import { useState } from "react";
import { useAuditLog } from "../hooks/useAudit";
import { exportToCSV } from "../utils/export";
import { shortId } from "../utils/format";

const ACTION_COLORS: Record<string, string> = {
  login_success: "var(--neon-cyan)",
  login_failed: "var(--neon-pink)",
  user_created: "var(--neon-green)",
  user_updated: "var(--gold-dim)",
  account_frozen: "var(--neon-pink)",
  account_activated: "var(--neon-green)",
  wallet_transfer: "var(--gold)",
  points_adjusted: "var(--gold)",
  game_started: "#A78BFA",
  game_completed: "#A78BFA",
  password_changed: "var(--neon-cyan)",
  password_reset: "var(--neon-cyan)",
};

const FILTERS = [
  { value: "", label: "All Events" },
  { value: "login_success", label: "Login" },
  { value: "login_failed", label: "Failed Login" },
  { value: "wallet_transfer", label: "Transfers" },
  { value: "points_adjusted", label: "Adjustments" },
  { value: "user_created", label: "Users Created" },
  { value: "account_frozen", label: "Frozen" },
  { value: "game_started", label: "Games" },
  { value: "password_reset", label: "Password Resets" },
];

export default function AuditLogs() {
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useAuditLog(true, action ? { action } : undefined);
  const items = data?.items ?? [];

  const filtered = items.filter(
    (e) =>
      search === "" ||
      (e.username ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.actorId ?? "").includes(search)
  );

  const handleExportCSV = () => {
    exportToCSV(
      filtered.map((e) => ({
        action: e.action,
        actor: e.username ?? (e.actorId ? shortId(e.actorId) : "unknown"),
        entityType: e.entityType ?? "",
        entityId: e.entityId ?? "",
        createdAt: e.createdAt,
      })),
      "audit_logs"
    );
  };

  return (
    <div style={{ padding: "26px 30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="font-cinzel" style={{ fontSize: 22, fontWeight: 700, color: "var(--gold)", margin: 0 }}>Audit Logs</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
            Immutable, platform-wide system event log — {filtered.length} entries
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          style={{ border: "1px solid rgba(201,153,58,0.3)", background: "rgba(201,153,58,0.1)", borderRadius: 8, padding: "7px 14px", color: "var(--gold)", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}
        >
          Export CSV
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text" placeholder="Search by user or ID..."
          aria-label="Search audit logs"
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ background: "var(--muted)", border: "1px solid rgba(201,153,58,0.2)", borderRadius: 8, padding: "8px 12px", color: "var(--foreground)", fontSize: 13, fontFamily: "Outfit, sans-serif", outline: "none", width: 230 }}
        />
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setAction(f.value)}
              style={{
                border: `1px solid ${action === f.value ? "rgba(201,153,58,0.5)" : "rgba(201,153,58,0.15)"}`,
                background: action === f.value ? "rgba(201,153,58,0.12)" : "transparent",
                borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600,
                color: action === f.value ? "var(--gold)" : "var(--muted-foreground)",
                cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.15)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="casino-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Event</th>
                <th style={{ textAlign: "left" }}>Actor</th>
                <th style={{ textAlign: "left" }}>Entity</th>
                <th style={{ textAlign: "left" }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const color = ACTION_COLORS[entry.action] ?? "var(--muted-foreground)";
                return (
                  <tr key={entry.id}>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap", border: `1px solid ${color}28` }}>
                        {entry.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td><span className="font-mono-data" style={{ fontSize: 13, color: "var(--gold)" }}>{entry.username ?? (entry.actorId ? shortId(entry.actorId) : "unknown")}</span></td>
                    <td className="font-mono-data" style={{ fontSize: 12, color: "var(--muted-foreground)" }} title={entry.entityId ?? undefined}>
                      {entry.entityType ? `${entry.entityType}${entry.entityId ? ` #${shortId(entry.entityId)}` : ""}` : "—"}
                    </td>
                    <td><span className="font-mono-data" style={{ fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{new Date(entry.createdAt).toLocaleString()}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!isLoading && filtered.length === 0 && (
          <div style={{ padding: 36, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No events match your filter.</div>
        )}
      </div>

      <div style={{ marginTop: 14, padding: "11px 15px", background: "rgba(201,153,58,0.05)", border: "1px solid rgba(201,153,58,0.1)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted-foreground)" }}>
        <span style={{ color: "var(--gold)", fontSize: 14 }}>◉</span>
        All entries are immutable. Tampering or deletion is not permitted by any role including Super Admin.
      </div>
    </div>
  );
}
