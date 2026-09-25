import type { AuthUser, Game } from "../../api/client";
import { formatPoints } from "../../utils/points";
import { useWallet } from "../../hooks/useWallet";
import GameCard from "./GameCard";
import type { Launcher } from "./GameLauncher";
import { bestScoreFor, computeProgress, themeFor } from "./gameMeta";

interface Props {
  user: AuthUser;
  games: Game[];
  launcher: Launcher;
  onGoArcade: () => void;
}

export default function PlayerLobby({ user, games, launcher, onGoArcade }: Props) {
  const { data: wallet } = useWallet(true);
  const balance = Number(wallet?.balance ?? 0);
  const progress = computeProgress(launcher.history);
  const featured = games.find((g) => g.pointCost <= balance) ?? games[0];
  const ft = themeFor(featured?.name);
  const recent = launcher.history.filter((s) => s.status === "completed").slice(0, 5);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {launcher.resumable && (
        <div className="pl-glass pop-in" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", borderColor: "rgba(0,212,255,.4)" }}>
          <span style={{ fontSize: 26 }}>⏯️</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 800 }}>You left a game unfinished</div>
            <div style={{ fontSize: 13, color: "#9A94A8" }}>{launcher.resumable.gameName} — the entry is already paid, finish it to lock in your score.</div>
          </div>
          <button className="pl-btn" style={{ padding: "10px 20px", fontSize: 13 }} onClick={launcher.resume}>Resume</button>
        </div>
      )}

      {/* Hero */}
      <section
        className="fade-up"
        style={{
          position: "relative", overflow: "hidden", borderRadius: 30, padding: "40px 36px", minHeight: 300,
          background: featured ? ft.gradient : "linear-gradient(135deg,#FF2D78,#8B2BE2)", display: "flex", alignItems: "center", gap: 24,
          boxShadow: `0 20px 60px ${ft.glow}`,
        }}
      >
        <div style={{ position: "absolute", right: -30, top: -40, fontSize: 320, opacity: 0.16, transform: "rotate(12deg)", pointerEvents: "none" }}>{ft.emoji}</div>
        <div style={{ position: "relative", flex: 1, maxWidth: 560 }}>
          <div style={{ fontSize: 13, letterSpacing: ".2em", fontWeight: 800, opacity: 0.9 }}>{greet.toUpperCase()}, {user.username.toUpperCase()}</div>
          <h1 className="hero-title" style={{ fontSize: 50, fontWeight: 900, lineHeight: 1.05, margin: "10px 0 12px", fontFamily: "'Outfit',sans-serif" }}>
            {featured ? <>Ready to beat<br />your best?</> : "New games coming soon"}
          </h1>
          {featured && (
            <>
              <p style={{ margin: "0 0 22px", fontSize: 16, opacity: 0.92 }}>
                Tonight&apos;s pick: <b>{featured.name}</b> — {ft.tagline}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button className="pl-btn" style={{ background: "#fff", boxShadow: "0 8px 30px rgba(0,0,0,.35)" }} onClick={() => launcher.pick(featured)}>▶ Play {featured.name}</button>
                <button className="pl-btn ghost" onClick={onGoArcade}>Browse all games</button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Player card */}
      <section className="fade-up" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16, animationDelay: "80ms" }}>
        <div className="pl-glass" style={{ padding: 22, gridColumn: "span 2", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 66, height: 66, borderRadius: "50%", background: "linear-gradient(135deg,#FFD166,#FF2D78)", display: "grid", placeItems: "center", fontSize: 28, fontWeight: 900, color: "#07070D", flexShrink: 0 }}>
              {progress.level}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{progress.title}</div>
              <div style={{ fontSize: 13, color: "#9A94A8" }}>Level {progress.level} · {progress.xpForNext - progress.xpIntoLevel} XP to next level</div>
              <div style={{ height: 10, background: "rgba(255,255,255,.1)", borderRadius: 8, marginTop: 10, overflow: "hidden" }}>
                <div className="shine" style={{ height: "100%", width: `${(progress.xpIntoLevel / progress.xpForNext) * 100}%`, backgroundImage: "linear-gradient(90deg,#FFD166,#FF2D78,#FFD166)", borderRadius: 8, transition: "width .8s" }} />
              </div>
            </div>
          </div>
        </div>
        <Stat icon="◆" label="Points" value={formatPoints(balance)} color="#FFD166" />
        <Stat icon="🏆" label="Best score" value={progress.bestScore ? progress.bestScore.toLocaleString() : "—"} color="#3DFF9A" />
        <Stat icon="🔥" label="Day streak" value={String(progress.streak)} color="#FF9F45" />
        <Stat icon="🎮" label="Games played" value={String(progress.plays)} color="#00D4FF" />
      </section>

      {/* Games */}
      <section>
        <SectionTitle title="Play now" action={{ label: "See all →", onClick: onGoArcade }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
          {games.map((g, i) => (
            <GameCard key={g.id} game={g} delay={i * 70} affordable={balance >= g.pointCost} best={bestScoreFor(launcher.history, g.id)} onPick={launcher.pick} />
          ))}
          {games.length === 0 && <div className="pl-glass" style={{ padding: 30, color: "#9A94A8" }}>No games are live right now. Check back soon!</div>}
        </div>
      </section>

      {/* Recent */}
      <section>
        <SectionTitle title="Your recent runs" />
        {recent.length === 0 ? (
          <div className="pl-glass" style={{ padding: 30, textAlign: "center", color: "#9A94A8" }}>Nothing here yet — your first game is one tap away. 🚀</div>
        ) : (
          <div className="pl-scroll-x">
            {recent.map((s) => {
              const t = themeFor(s.gameName);
              return (
                <div key={s.id} className="pl-glass" style={{ minWidth: 200, padding: 16, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 12, background: t.gradient, display: "grid", placeItems: "center", fontSize: 20 }}>{t.emoji}</span>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.gameName}</div>
                  </div>
                  <div className="font-mono-data" style={{ fontSize: 26, fontWeight: 800, color: "#FFD166", marginTop: 10 }}>{(s.score ?? 0).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "#9A94A8" }}>{new Date(s.completedAt ?? s.startedAt).toLocaleDateString()}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="pl-glass" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div className="font-mono-data" style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#9A94A8", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{title}</h2>
      {action && <button onClick={action.onClick} style={{ background: "none", border: "none", color: "#FFD166", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>{action.label}</button>}
    </div>
  );
}
