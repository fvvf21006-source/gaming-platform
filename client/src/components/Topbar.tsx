import { useState } from "react";
import type { NavItem } from "./Sidebar";
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from "../hooks/useNotifications";

const VIEW_TITLES: Record<NavItem, string> = {
  dashboard: "Dashboard",
  users: "Users",
  wallet: "Wallet & Points",
  game: "Game Access",
  reports: "Reports & Analytics",
  audit: "Audit Logs",
  profile: "My Profile",
};

interface Props {
  active: NavItem;
  onMobileToggleMenu?: () => void;
}

export default function Topbar({ active, onMobileToggleMenu }: Props) {
  const { data } = useNotifications(true);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [showNotifications, setShowNotifications] = useState(false);

  const myNotifications = data?.items ?? [];
  const unreadCount = myNotifications.filter((n) => !n.isRead).length;

  return (
    <header
      style={{
        height: 64,
        background: "rgba(7,7,13,0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 22px",
        flexShrink: 0,
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {onMobileToggleMenu && (
          <button
            onClick={onMobileToggleMenu}
            aria-label="Toggle Navigation Menu"
            style={{
              background: "rgba(201,153,58,0.1)",
              border: "1px solid rgba(201,153,58,0.2)",
              borderRadius: 6,
              color: "#FFD166",
              fontSize: 16,
              padding: "4px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ☰
          </button>
        )}
        <div style={{ width: 3, height: 18, background: "linear-gradient(180deg, #FFD166, #C9993A)", borderRadius: 2 }} />
        <h2 style={{ fontFamily: "Outfit, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
          {VIEW_TITLES[active]}
        </h2>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
        <div className="hidden-mobile" style={{ fontSize: 13, color: "var(--muted-foreground)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "8px 14px" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </div>

        {/* Notifications Icon & Popover */}
        <button
          onClick={() => setShowNotifications((prev) => !prev)}
          aria-label="Notifications"
          style={{ position: "relative", width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", color: unreadCount > 0 ? "#FFD166" : "var(--muted-foreground)", fontSize: 16, transition: "color 0.15s" }}
        >
          🔔
          {unreadCount > 0 && (
            <span style={{ position: "absolute", top: 0, right: 0, width: 16, height: 16, background: "var(--neon-pink)", borderRadius: "50%", fontSize: 10, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div
            style={{
              position: "absolute",
              top: 42,
              right: 0,
              width: 320,
              maxHeight: 380,
              background: "#0F0F1A",
              border: "1px solid rgba(201,153,58,0.3)",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(201,153,58,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="font-cinzel" style={{ fontSize: 13, fontWeight: 700, color: "#FFD166" }}>Notifications ({unreadCount})</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  style={{ background: "none", border: "none", color: "var(--neon-cyan)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {myNotifications.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>No notifications yet</div>
              ) : (
                myNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && markRead.mutate(n.id)}
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid rgba(201,153,58,0.05)",
                      background: n.isRead ? "transparent" : "rgba(201,153,58,0.06)",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 13, color: "var(--foreground)", marginBottom: 3 }}>{n.message}</div>
                    <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #C9993A, #FFD166)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#07070D", fontWeight: 700 }}>
          ♛
        </div>
      </div>
    </header>
  );
}
