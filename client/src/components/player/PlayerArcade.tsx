import { useState } from "react";
import type { Game } from "../../api/client";
import { useWallet } from "../../hooks/useWallet";
import GameCard from "./GameCard";
import type { Launcher } from "./GameLauncher";
import { bestScoreFor } from "./gameMeta";
import { SectionTitle } from "./PlayerLobby";

export default function PlayerArcade({ games, launcher }: { games: Game[]; launcher: Launcher }) {
  const { data: wallet } = useWallet(true);
  const balance = Number(wallet?.balance ?? 0);
  const [filter, setFilter] = useState("All");

  const categories = ["All", ...Array.from(new Set(games.map((g) => g.category ?? "Arcade")))];
  const shown = games.filter((g) => filter === "All" || (g.category ?? "Arcade") === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <SectionTitle title="🎮 The Arcade" />
        <p style={{ margin: "-6px 0 0", color: "#9A94A8" }}>Pick a game, beat your best, climb the levels.</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {categories.map((c) => (
          <button key={c} className={`pl-nav-link ${filter === c ? "active" : ""}`} style={{ border: filter === c ? "none" : "1px solid rgba(255,255,255,.1)" }} onClick={() => setFilter(c)}>
            {c}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
        {shown.map((g, i) => (
          <GameCard key={g.id} game={g} delay={i * 70} affordable={balance >= g.pointCost} best={bestScoreFor(launcher.history, g.id)} onPick={launcher.pick} />
        ))}
      </div>
      {shown.length === 0 && <div className="pl-glass" style={{ padding: 30, color: "#9A94A8", textAlign: "center" }}>No games in this category yet.</div>}
    </div>
  );
}
