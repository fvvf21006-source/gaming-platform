import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import LoginScreen from "./components/LoginScreen";
import Sidebar, { type NavItem } from "./components/Sidebar";
import Topbar from "./components/Topbar";
import DashboardHome from "./components/DashboardHome";
import UserManagement from "./components/UserManagement";
import WalletPanel from "./components/WalletPanel";
import GameAccess from "./components/GameAccess";
import Reports from "./components/Reports";
import AuditLogs from "./components/AuditLogs";
import UserProfile from "./components/UserProfile";
import ForcedPasswordChange from "./components/ForcedPasswordChange";
import PlayerApp from "./components/player/PlayerApp";
import { clearToken, fetchMe, getToken, type AuthUser } from "./api/client";
import { can, type Permission } from "./utils/permissions";

const ROUTE_PERMISSIONS: Record<string, Permission> = {
  users: "users.view",
  wallet: "wallet.view",
  game: "game.play",
  reports: "reports.view",
  audit: "audit.view",
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoadingAuth(false);
      return;
    }

    fetchMe()
      .then((user) => setCurrentUser(user))
      .catch(() => {
        clearToken();
        setCurrentUser(null);
      })
      .finally(() => setLoadingAuth(false));
  }, []);

  const pathSegment = location.pathname.replace("/", "") || "dashboard";
  const activeNav: NavItem = [
    "dashboard", "users", "wallet", "game", "reports", "audit", "profile"
  ].includes(pathSegment) ? (pathSegment as NavItem) : "dashboard";

  if (loadingAuth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--foreground)", fontFamily: "Outfit, sans-serif" }}>
        Loading authentication...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={(user) => {
          setCurrentUser(user);
          navigate("/dashboard");
        }}
      />
    );
  }

  // BR-45 / P08: a password reset forces a change before anything else is reachable.
  if (currentUser.mustChangePassword) {
    return (
      <ForcedPasswordChange
        onChanged={() => setCurrentUser({ ...currentUser, mustChangePassword: false })}
        onLogout={() => {
          clearToken();
          setCurrentUser(null);
        }}
      />
    );
  }

  // Players get their own arcade-style experience instead of the admin dashboard shell.
  if (currentUser.role === "player") {
    return (
      <PlayerApp
        user={currentUser}
        onUserUpdated={setCurrentUser}
        onLogout={() => {
          clearToken();
          setCurrentUser(null);
          navigate("/login");
        }}
      />
    );
  }

  if (pathSegment === "game") {
    if (!can(currentUser.role, "game.play") && !can(currentUser.role, "game.alter")) {
      return <Navigate to="/dashboard" replace />;
    }
  } else {
    const requiredPermission = ROUTE_PERMISSIONS[pathSegment];
    if (requiredPermission && !can(currentUser.role, requiredPermission)) {
      return <Navigate to="/dashboard" replace />;
    }
  }


  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--background)" }}>
      <Sidebar
        role={currentUser.role}
        name={currentUser.username}
        userId={currentUser.id}
        active={activeNav}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onNav={(item) => {
          navigate(`/${item}`);
          setMobileOpen(false);
        }}
        onLogout={() => {
          clearToken();
          setCurrentUser(null);
          navigate("/login");
        }}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh" }}>
        <Topbar active={activeNav} onMobileToggleMenu={() => setMobileOpen(true)} />
        <main style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardHome currentUser={currentUser} />} />
            <Route path="/users" element={<UserManagement currentUser={currentUser} />} />
            <Route path="/wallet" element={<WalletPanel currentUser={currentUser} />} />
            <Route path="/game" element={<GameAccess currentUser={currentUser} />} />
            <Route path="/reports" element={<Reports currentUser={currentUser} />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="/profile" element={<UserProfile currentUser={currentUser} onUpdated={setCurrentUser} />} />
            <Route
              path="*"
              element={
                <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--foreground)" }}>
                  <h1 className="font-cinzel" style={{ fontSize: 36, color: "var(--gold)", marginBottom: 12 }}>404 — Page Not Found</h1>
                  <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 24 }}>The requested route does not exist or has been moved.</p>
                  <button
                    onClick={() => navigate("/dashboard")}
                    style={{ background: "linear-gradient(135deg, #C9993A, #FFD166)", border: "none", borderRadius: 8, padding: "10px 20px", color: "#07070D", fontWeight: 700, cursor: "pointer" }}
                  >
                    Return to Dashboard
                  </button>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
