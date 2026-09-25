import { useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import type { AuthUser } from "../../api/client";
import { formatPoints } from "../../utils/points";
import { useGames } from "../../hooks/useGames";
import { useWallet } from "../../hooks/useWallet";
import { useMarkAllNotificationsRead, useNotifications } from "../../hooks/useNotifications";
import UserProfile from "../UserProfile";
import GameLauncher, { useGameLauncher } from "./GameLauncher";
import PlayerLobby from "./PlayerLobby";
import PlayerArcade from "./PlayerArcade";
import PlayerWallet from "./PlayerWallet";
import { computeProgress } from "./gameMeta";

interface Props {
  user: AuthUser;
  onLogout: () => void;
  onUserUpdated: (u: AuthUser) => void;
}

const TABS = [
  { path: "/lobby", label: "Lobby", icon: "🏠" },
  { path: "/arcade", label: "Arcade", icon: "🎮" },
  { path: "/wallet", label: "Points", icon: "◆" },
  { path: "/profile", label: "Me", icon: "👤" },
];

export default function PlayerApp({ user, onLogout, onUserUpdated }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: gamesData } = useGames(true);
  const { data: wallet } = useWallet(true);
  const { data: notifData } = useNotifications(true);
  const markAll = useMarkAllNotificationsRead();
  const [bellOpen, setBellOpen] = useState(false);

  const games = gamesData?.items ?? [];
  const launcher = useGameLauncher(games);
  const progress = computeProgress(launcher.history);
  const notifs = notifData?.items ?? [];
  const unread = notifs.filter((n) => !n.isRead).length;

  const NavButtons = ({ mobile }: { mobile?: boolean }) => (
    <>
      {TABS.map((t) => (
        <button
          key={t.path}
          className={`pl-nav-link ${pathname === t.path ? "active" : ""}`}
          style={mobile ? { flexDirection: "column", gap: 2, fontSize: 11, padding: "6px 14px", borderRadius: 14 } : undefined}
          onClick={() => navigate(t.path)}
        >
          <span style={{ fontSize: mobile ? 20 : 15 }}>{t.icon}</span>{t.label}
        </button>
      ))}
    </>
  );

  return (
    <div className="pl-bg" style={{ color: "#EDE8D8", fontFamily: "'Outfit',sans-serif" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(9,8,18,.75)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 18 }}>
          <button onClick={() => navigate("/lobby")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: "#fff" }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#FFD166,#FF2D78)", display: "grid", placeItems: "center", fontSize: 20 }}>👑</span>
            <span className="hidden-mobile" style={{ fontWeight: 900, fontSize: 19, letterSpacing: ".02em" }}>Lucky Crown</span>
          </button>
          <nav className="pl-nav-desktop" style={{ gap: 6, marginLeft: 8 }}><NavButtons /></nav>
          <div style={{ flex: 1 }} />

          <div title="Your points" className="font-mono-data" style={{ background: "rgba(255,209,102,.12)", border: "1px solid rgba(255,209,102,.4)", color: "#FFD166", borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 15 }}>
            ◆ {formatPoints(wallet?.balance)}
          </div>

          <div style={{ position: "relative" }}>
            <button aria-label="Notifications" onClick={() => setBellOpen((o) => !o)} style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", cursor: "pointer", fontSize: 18, position: "relative" }}>
              🔔
              {unread > 0 && <span style={{ position: "absolute", top: -3, right: -3, background: "#FF2D78", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "2px 6px" }}>{unread}</span>}
            </button>
            {bellOpen && (
              <div className="pl-glass pop-in" style={{ position: "absolute", right: 0, top: 50, width: 320, maxHeight: 380, overflowY: "auto", padding: 8, background: "rgba(16,14,30,.97)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", alignItems: "center" }}>
                  <b>Notifications</b>
                  {unread > 0 && <button onClick={() => markAll.mutate()} style={{ background: "none", border: "none", color: "#FFD166", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>Mark all read</button>}
                </div>
                {notifs.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#9A94A8", fontSize: 13 }}>You&apos;re all caught up 🎉</div>}
                {notifs.slice(0, 10).map((n) => (
                  <div key={n.id} style={{ padding: "10px", borderRadius: 12, background: n.isRead ? "transparent" : "rgba(0,212,255,.08)", fontSize: 13 }}>
                    {n.message}
                    <div style={{ fontSize: 11, color: "#7d778f", marginTop: 2 }}>{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={onLogout} title={`Level ${progress.level} · ${user.username} — click to log out`} style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 999, padding: "4px 14px 4px 4px", cursor: "pointer", color: "#EDE8D8" }}>
            <span style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#00D4FF,#8B5CF6)", display: "grid", placeItems: "center", fontWeight: 900 }}>{user.username[0]?.toUpperCase()}</span>
            <span className="hidden-mobile" style={{ fontSize: 13, fontWeight: 700 }}>Log out</span>
          </button>
        </div>
      </header>

      <main className="pl-main" onClick={() => bellOpen && setBellOpen(false)}>
        <Routes>
          <Route path="/" element={<Navigate to="/lobby" replace />} />
          <Route path="/dashboard" element={<Navigate to="/lobby" replace />} />
          <Route path="/lobby" element={<PlayerLobby user={user} games={games} launcher={launcher} onGoArcade={() => navigate("/arcade")} />} />
          <Route path="/arcade" element={<PlayerArcade games={games} launcher={launcher} />} />
          <Route path="/wallet" element={<PlayerWallet user={user} />} />
          <Route path="/profile" element={<div className="pl-glass" style={{ overflow: "hidden" }}><UserProfile currentUser={user} onUpdated={onUserUpdated} /></div>} />
          <Route path="*" element={<Navigate to="/lobby" replace />} />
        </Routes>
      </main>

      <nav className="pl-nav-mobile"><NavButtons mobile /></nav>
      <GameLauncher l={launcher} />
    </div>
  );
}
