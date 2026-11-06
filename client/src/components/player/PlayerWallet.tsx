import type { AuthUser } from "../../api/client";
import { formatPoints } from "../../utils/points";
import { useWallet } from "../../hooks/useWallet";


export default function PlayerWallet(_props: { user: AuthUser }) {
  const { data: wallet } = useWallet(true);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="pl-glass fade-up" style={{ padding: "34px 28px", textAlign: "center", background: "linear-gradient(135deg, rgba(255,209,102,.16), rgba(255,45,120,.12))", borderColor: "rgba(255,209,102,.3)" }}>
        <div style={{ fontSize: 13, letterSpacing: ".2em", color: "#C9C3D8", fontWeight: 800 }}>MY POINTS</div>
        <div className="font-mono-data" style={{ fontSize: 68, fontWeight: 800, color: "#FFD166", lineHeight: 1.1 }}>◆ {formatPoints(wallet?.balance)}</div>
        <div style={{ color: "#9A94A8", fontSize: 14 }}>Points are for playing games only — they have no cash value.</div>
      </div>

    </div>
  );
}
