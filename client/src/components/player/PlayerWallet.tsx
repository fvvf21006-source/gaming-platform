import type { AuthUser } from "../../api/client";
import { formatPoints } from "../../utils/points";
import { useWallet, useTransactionHistory } from "../../hooks/useWallet";
import { useGameHistory } from "../../hooks/useGames";
import { themeFor } from "./gameMeta";
import { SectionTitle } from "./PlayerLobby";

interface Entry { id: string; at: string; icon: string; title: string; delta: number; note?: string }

export default function PlayerWallet({ user }: { user: AuthUser }) {
  const { data: wallet } = useWallet(true);
  const { data: tx } = useTransactionHistory(true);
  const { data: hist } = useGameHistory(true);

  const entries: Entry[] = [
    ...(tx?.items ?? []).map<Entry>((t) => {
      const incoming = t.recipientId === user.id;
      const amt = Number(t.amount);
      return {
        id: `t-${t.id}`, at: t.createdAt, icon: incoming ? "🎁" : "↩️",
        title: t.transactionType === "transfer" ? "Points received" : t.transactionType === "admin_add" ? "Bonus points added" : t.transactionType === "admin_remove" ? "Points removed" : "Balance updated",
        delta: incoming ? amt : -amt,
      };
    }),
    ...(hist?.items ?? []).map<Entry>((s) => ({
      id: `s-${s.id}`, at: s.startedAt, icon: themeFor(s.gameName).emoji, title: `Played ${s.gameName ?? "a game"}`,
      delta: -s.pointsSpent, note: s.score !== null ? `Score ${s.score.toLocaleString()}` : "Unfinished",
    })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="pl-glass fade-up" style={{ padding: "34px 28px", textAlign: "center", background: "linear-gradient(135deg, rgba(255,209,102,.16), rgba(255,45,120,.12))", borderColor: "rgba(255,209,102,.3)" }}>
        <div style={{ fontSize: 13, letterSpacing: ".2em", color: "#C9C3D8", fontWeight: 800 }}>MY POINTS</div>
        <div className="font-mono-data" style={{ fontSize: 68, fontWeight: 800, color: "#FFD166", lineHeight: 1.1 }}>◆ {formatPoints(wallet?.balance)}</div>
        <div style={{ color: "#9A94A8", fontSize: 14 }}>Points are for playing games only — they have no cash value.</div>
      </div>
      <div>
        <SectionTitle title="Activity" />
        <div className="pl-glass" style={{ overflow: "hidden" }}>
          {entries.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#9A94A8" }}>No activity yet.</div>}
          {entries.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
              <span style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(255,255,255,.07)", display: "grid", placeItems: "center", fontSize: 21, flexShrink: 0 }}>{e.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{e.title}</div>
                <div style={{ fontSize: 12, color: "#9A94A8" }}>{new Date(e.at).toLocaleString()}{e.note ? ` · ${e.note}` : ""}</div>
              </div>
              <div className="font-mono-data" style={{ fontWeight: 800, fontSize: 16, color: e.delta >= 0 ? "#3DFF9A" : "#FF7AA5" }}>
                {e.delta >= 0 ? "+" : "−"}{formatPoints(Math.abs(e.delta))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
