import { useEffect, type ReactNode } from "react";
import type { Role } from "../types/auth";
import { ROLE_COLORS, ROLE_LABELS, ROLE_ORDER } from "../constants/roles";
import { can, Permission } from "../utils/permissions";

export type NavItem =
  | "dashboard"
  | "users"
  | "wallet"
  | "game"
  | "reports"
  | "audit"
  | "profile";

interface NavEntry { id: NavItem; label: string; icon: ReactNode; permission?: Permission }

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {children}
    </svg>
  );
}

const ICONS = {
  dashboard: <Icon><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></Icon>,
  users: <Icon><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.4c1.9.8 3 2.6 3 5.6" /></Icon>,
  wallet: <Icon><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19v14H5.5A2.5 2.5 0 0 1 3 16.5z" /><path d="M19 9h2v6h-2a3 3 0 0 1 0-6z" /></Icon>,
  game: <Icon><rect x="2.5" y="7" width="19" height="11" rx="5" /><path d="M7.5 10.5v4M5.5 12.5h4" /><circle cx="15.5" cy="11.5" r=".7" fill="currentColor" /><circle cx="18" cy="13.5" r=".7" fill="currentColor" /></Icon>,
  reports: <Icon><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Icon>,
  audit: <Icon><path d="M12 3l8 3v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6z" /><path d="M9 12l2.2 2.2L15.5 10" /></Icon>,
  profile: <Icon><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></Icon>,
  logout: <Icon><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M16 8l4 4-4 4M20 12H9" /></Icon>,
  collapse: <Icon><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" /></Icon>,
  expand: <Icon><path d="M13 17l5-5-5-5M6 17l5-5-5-5" /></Icon>,
};

const NAV_GROUPS: { label: string; items: NavEntry[] }[] = [
  { label: "", items: [{ id: "dashboard", label: "Dashboard", icon: ICONS.dashboard }] },
  { label: "Manage", items: [
    { id: "users", label: "Users", icon: ICONS.users, permission: "users.view" },
    { id: "wallet", label: "Wallet", icon: ICONS.wallet, permission: "wallet.view" },
    { id: "game", label: "Game Control", icon: ICONS.game },
  ] },
  { label: "Insights", items: [
    { id: "reports", label: "Reports", icon: ICONS.reports, permission: "reports.view" },
    { id: "audit", label: "Audit Logs", icon: ICONS.audit, permission: "audit.view" },
  ] },
];

interface Props {
  role: Role;
  name: string;
  userId: string;
  active: NavItem;
  collapsed: boolean;
  mobileOpen?: boolean;
  onNav: (item: NavItem) => void;
  onLogout: () => void;
  onToggle: () => void;
  onMobileClose?: () => void;
}

export default function Sidebar({
  role, name, userId, active, collapsed, mobileOpen = false, onNav, onLogout, onToggle, onMobileClose,
}: Props) {
  const visibleGroups = NAV_GROUPS
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (n) =>
          !n.permission ||
          can(role, n.permission) ||
          (n.id === "game" && (can(role, "game.play") || can(role, "game.alter")))
      ),
    }))
    .filter((g) => g.items.length > 0);

  const roleColor = ROLE_COLORS[role];
  const currentTierIndex = ROLE_ORDER.indexOf(role);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen && onMobileClose) onMobileClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onMobileClose]);

  const rowStyle = (isActive: boolean) => ({
    position: "relative" as const,
    display: "flex", alignItems: "center", gap: 12, width: "100%",
    padding: collapsed ? "12px 0" : "12px 14px",
    justifyContent: collapsed ? "center" : "flex-start",
    borderRadius: 14, border: "none",
    background: isActive ? "rgba(255,255,255,0.07)" : "transparent",
    color: isActive ? "#FFD166" : "var(--muted-foreground)",
    cursor: "pointer", fontSize: 14, fontFamily: "Outfit, sans-serif", fontWeight: isActive ? 600 : 500,
    whiteSpace: "nowrap" as const, overflow: "hidden",
  });

  const nav = (item: NavEntry) => {
    const isActive = item.id === active;
    return (
      <button
        key={item.id}
        className="sb-item"
        onClick={() => { onNav(item.id); onMobileClose?.(); }}
        aria-current={isActive ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        style={rowStyle(isActive)}
      >
        {isActive && <span style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 3, borderRadius: 3, background: "linear-gradient(180deg,#FFD166,#C9993A)" }} />}
        {item.icon}
        {!collapsed && <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>}
      </button>
    );
  };

  const sidebarContent = (
    <aside
      role="navigation"
      aria-label="Main Navigation"
      style={{
        width: collapsed ? 76 : 252, height: "100vh", overflowY: "auto", background: "#0A0A14",
        borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column",
        transition: "width 0.25s ease", flexShrink: 0, zIndex: 30, padding: "20px 12px 14px",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : "flex-start", padding: collapsed ? 0 : "0 6px", marginBottom: 22 }}>
        <span style={{ width: 36, height: 36, borderRadius: 12, background: "linear-gradient(135deg,#C9993A,#FFD166)", display: "grid", placeItems: "center", fontSize: 18, color: "#07070D", flexShrink: 0 }}>♛</span>
        {!collapsed && <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 19, fontWeight: 800, letterSpacing: "0.04em", color: "#EDE8D8" }}>LUCKY CROWN</span>}
      </div>

      {/* Nav groups */}
      <nav style={{ display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {visibleGroups.map((group, gi) => (
          <div key={gi} style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: gi === 0 ? 0 : 14, marginTop: gi === 0 ? 0 : 14, borderTop: gi === 0 ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
            {group.label && !collapsed && (
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(154,148,168,0.7)", padding: "0 14px 4px" }}>{group.label}</div>
            )}
            {group.items.map(nav)}
          </div>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Hierarchy card — styled like the reference's "Upgrade" box */}
      {!collapsed && (
        <div className="sb-hier" style={{ margin: "16px 0", padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(160deg, rgba(201,153,58,0.14), rgba(255,255,255,0.02) 60%)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ width: 30, height: 30, borderRadius: 10, background: "#07070D", border: "1px solid rgba(255,209,102,0.4)", display: "grid", placeItems: "center", color: "#FFD166", fontSize: 14 }}>⬡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Hierarchy position</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Where you sit in the chain</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {ROLE_ORDER.map((r, i) => {
              const isCurrent = i === currentTierIndex;
              const c = ROLE_COLORS[r];
              return (
                <div key={r} style={{ display: "flex", alignItems: "center", gap: 9, opacity: isCurrent ? 1 : 0.65 }}>
                  <span style={{ width: isCurrent ? 9 : 7, height: isCurrent ? 9 : 7, borderRadius: "50%", background: isCurrent ? c : "rgba(255,255,255,0.18)", boxShadow: isCurrent ? `0 0 8px ${c}` : "none" }} />
                  <span style={{ fontSize: 12, color: isCurrent ? c : "var(--muted-foreground)", fontWeight: isCurrent ? 700 : 500 }}>{ROLE_LABELS[r]}{isCurrent ? " · you" : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Profile / sign out / collapse */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
        <button
          className="sb-item"
          onClick={() => { onNav("profile"); onMobileClose?.(); }}
          aria-current={active === "profile" ? "page" : undefined}
          title={collapsed ? name : undefined}
          style={{ ...rowStyle(active === "profile"), padding: collapsed ? "8px 0" : "8px 10px" }}
        >
          <span style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${roleColor}, ${roleColor}66)`, display: "grid", placeItems: "center", fontWeight: 800, color: "#07070D", flexShrink: 0 }}>{name[0]?.toUpperCase()}</span>
          {!collapsed && (
            <span style={{ textAlign: "left", minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
              <span style={{ display: "block", fontSize: 11, color: roleColor }}>{ROLE_LABELS[role]} · {userId.slice(0, 6)}</span>
            </span>
          )}
        </button>
        <button className="sb-item" onClick={onLogout} aria-label="Sign Out" title={collapsed ? "Sign Out" : undefined} style={rowStyle(false)}>
          {ICONS.logout}
          {!collapsed && <span>Sign out</span>}
        </button>
        <button className="sb-item" onClick={onToggle} aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"} style={rowStyle(false)}>
          {collapsed ? ICONS.expand : ICONS.collapse}
          {!collapsed && <span>Collapse sidebar</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden-mobile" style={{ display: "flex" }}>{sidebarContent}</div>

      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex" }} onClick={onMobileClose}>
          <div onClick={(e) => e.stopPropagation()}>{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
