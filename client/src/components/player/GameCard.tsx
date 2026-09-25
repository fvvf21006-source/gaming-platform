import type { Game } from "../../api/client";
import { themeFor } from "./gameMeta";

interface Props {
  game: Game;
  affordable: boolean;
  best: number;
  onPick: (g: Game) => void;
  delay?: number;
}

export default function GameCard({ game, affordable, best, onPick, delay = 0 }: Props) {
  const t = themeFor(game.name);
  return (
    <button
      className="game-card fade-up"
      disabled={!affordable}
      onClick={() => onPick(game)}
      style={{ background: t.gradient, ["--glow" as string]: t.glow, animationDelay: `${delay}ms` }}
    >
      <div className="art"><span style={{ filter: "drop-shadow(0 8px 18px rgba(0,0,0,.45))" }}>{t.emoji}</span></div>
      <div className="shade" />
      <span className="play-chip">▶ PLAY</span>
      {best > 0 && (
        <span style={{ position: "absolute", top: 14, left: 14, background: "rgba(0,0,0,.45)", borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 700 }}>
          🏆 {best.toLocaleString()}
        </span>
      )}
      <div style={{ position: "relative", padding: "0 20px 20px" }}>
        <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>{game.name}</div>
        <div style={{ fontSize: 13, opacity: 0.85, margin: "4px 0 12px" }}>{t.tagline}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ background: "rgba(255,255,255,.18)", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 800 }}>
            {game.category ?? "Arcade"}
          </span>
          <span className="font-mono-data" style={{ fontWeight: 800, color: affordable ? "#FFD166" : "#FF8FB1" }}>
            {affordable ? `◆ ${game.pointCost} pts` : "Need more points"}
          </span>
        </div>
      </div>
    </button>
  );
}
