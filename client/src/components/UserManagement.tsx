import { formatPoints } from "../utils/points";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthUser, User } from "../api/client";
import type { Role } from "../types/auth";
import { ROLE_COLORS, ROLE_LABELS, ROLE_ORDER, CHILD_ROLE } from "../constants/roles";
import { createUserSchema, updateProfileSchema, type CreateUserInput, type UpdateProfileInput } from "../schemas/users";
import { useUsers, useCreateUser, useUpdateUser, useUpdateUserStatus, useResetUserPassword } from "../hooks/useUsers";
import { shortId } from "../utils/format";

const GOLD = "#FFD166";

const card: CSSProperties = {
  background: "linear-gradient(180deg, rgba(20,19,34,0.96), rgba(13,13,24,0.96))",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 22,
  boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
};

type View = "cards" | "tree" | "table";
type StatusFilter = "all" | "active" | "frozen";
type ConfirmAction = { kind: "freeze" | "reset"; user: User };

interface Props {
  currentUser: AuthUser;
}

export default function UserManagement({ currentUser }: Props) {
  const { data, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const updateStatus = useUpdateUserStatus();
  const resetPassword = useResetUserPassword();

  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("cards");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [tempPassword, setTempPassword] = useState<{ username: string; value: string } | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const childRole = CHILD_ROLE[currentUser.role];
  const allUsers = data?.items ?? [];
  const rootUser = allUsers.find((u) => u.id === currentUser.id);
  const visible = useMemo(() => allUsers.filter((u) => u.id !== currentUser.id), [allUsers, currentUser.id]);
  const nameById = useMemo(() => new Map(allUsers.map((u) => [u.id, u.username])), [allUsers]);

  const activeCount = visible.filter((u) => u.status === "active").length;
  const frozenCount = visible.length - activeCount;
  const directCount = visible.filter((u) => u.createdBy === currentUser.id).length;
  const rolesPresent = ROLE_ORDER.filter((r) => visible.some((u) => u.role === r));

  const q = search.trim().toLowerCase();
  const filtered = visible.filter(
    (u) =>
      (roleFilter === "all" || u.role === roleFilter) &&
      (statusFilter === "all" || u.status === statusFilter) &&
      (!q || u.id.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  );
  const filtersActive = q !== "" || roleFilter !== "all" || statusFilter !== "all";

  const showToast = (text: string, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3200);
  };

  const runStatusChange = (u: User, status: "active" | "frozen") => {
    updateStatus.mutate(
      { id: u.id, status },
      {
        onSuccess: () => {
          showToast(status === "frozen" ? `${u.username} was frozen` : `${u.username} is active again`);
          setSelectedUser((cur) => (cur && cur.id === u.id ? { ...cur, status } : cur));
        },
        onError: (e: Error) => showToast(e.message, false),
      }
    );
  };

  // Freezing and password resets are disruptive, so they ask first; re-activating does not.
  const requestToggle = (u: User) => (u.status === "active" ? setConfirm({ kind: "freeze", user: u }) : runStatusChange(u, "active"));
  const requestReset = (u: User) => setConfirm({ kind: "reset", user: u });

  const handleConfirm = () => {
    if (!confirm) return;
    const { kind, user } = confirm;
    setConfirm(null);
    if (kind === "freeze") runStatusChange(user, "frozen");
    else
      resetPassword.mutate(user.id, {
        onSuccess: (temp) => setTempPassword({ username: user.username, value: temp }),
        onError: (e: Error) => showToast(e.message, false),
      });
  };

  const actions = { onSelect: setSelectedUser, onToggle: requestToggle, onReset: requestReset };

  return (
    <div style={{ padding: "24px 28px 48px", fontFamily: "'Outfit',sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em" }}>Users</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--muted-foreground)" }}>Manage the accounts you created and everyone beneath them.</p>
        </div>
        {childRole && (
          <button className="um-primary" onClick={() => setShowCreate(true)}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> Create {ROLE_LABELS[childRole]}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="um-stats">
        <Stat label="Total accounts" value={visible.length} hint={`${directCount} created by you`} color={GOLD} icon="◈" />
        <Stat label="Active" value={activeCount} hint="Can log in and act" color="var(--neon-green)" icon="●" />
        <Stat label="Frozen" value={frozenCount} hint={frozenCount ? "Locked out until reactivated" : "Nobody is locked out"} color="var(--neon-pink)" icon="❄" />
        <Stat label="Players" value={visible.filter((u) => u.role === "player").length} hint="Can play games" color="var(--neon-cyan)" icon="♠" />
      </div>

      {/* Toolbar */}
      <div style={{ ...card, padding: 14, margin: "18px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div className="um-search">
            <span style={{ opacity: 0.6 }}>🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or ID…" aria-label="Search users" />
            {search && <button onClick={() => setSearch("")} aria-label="Clear search" style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 16 }}>×</button>}
          </div>
          <div className="um-seg" role="tablist" aria-label="View">
            {([["cards", "Cards"], ["tree", "Hierarchy"], ["table", "Table"]] as [View, string][]).map(([v, label]) => (
              <button key={v} role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{label}</button>
            ))}
          </div>
        </div>
        {view !== "tree" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Chip active={roleFilter === "all"} onClick={() => setRoleFilter("all")}>All roles</Chip>
            {rolesPresent.map((r) => (
              <Chip key={r} active={roleFilter === r} color={ROLE_COLORS[r]} onClick={() => setRoleFilter(roleFilter === r ? "all" : r)}>{ROLE_LABELS[r]}</Chip>
            ))}
            <span style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />
            {(["all", "active", "frozen"] as StatusFilter[]).map((s) => (
              <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{s === "all" ? "Any status" : s === "active" ? "Active" : "Frozen"}</Chip>
            ))}
            {filtersActive && (
              <button onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); }} style={{ marginLeft: "auto", background: "none", border: "none", color: GOLD, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="um-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="um-skeleton" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="◈"
          title={`No ${childRole ? ROLE_LABELS[childRole].toLowerCase() : ""} accounts yet`}
          body={childRole ? "Create your first one to start building out your hierarchy." : "Nothing has been created under you yet."}
          action={childRole ? <button className="um-primary" onClick={() => setShowCreate(true)}>＋ Create {ROLE_LABELS[childRole]}</button> : undefined}
        />
      ) : view === "tree" ? (
        <div style={{ ...card, padding: 20 }}>
          {rootUser && <TreeNode user={rootUser} depth={0} allUsers={allUsers} currentUserId={currentUser.id} {...actions} />}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔍" title="No accounts match" body="Try a different search or clear the filters." action={<button className="um-ghost" onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); }}>Clear filters</button>} />
      ) : view === "cards" ? (
        <div className="um-grid">
          {filtered.map((u, i) => <UserCard key={u.id} user={u} parent={u.createdBy ? nameById.get(u.createdBy) : undefined} delay={Math.min(i, 12) * 30} {...actions} />)}
        </div>
      ) : (
        <UserTable users={filtered} {...actions} />
      )}

      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          parentName={selectedUser.createdBy ? nameById.get(selectedUser.createdBy) ?? shortId(selectedUser.createdBy) : "—"}
          onClose={() => setSelectedUser(null)}
          onToggle={requestToggle}
          onReset={requestReset}
          onSave={(id, payload, cb) =>
            updateUser.mutate({ id, payload }, {
              onSuccess: (updated) => { setSelectedUser(updated); showToast("Profile updated"); cb.onSuccess(); },
              onError: (e: Error) => cb.onError(e.message),
            })
          }
          saving={updateUser.isPending}
        />
      )}

      {confirm && (
        <Modal onClose={() => setConfirm(null)} maxWidth={420}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>{confirm.kind === "freeze" ? "❄️" : "🔑"}</div>
            <h2 style={{ margin: "8px 0 6px", fontSize: 20 }}>{confirm.kind === "freeze" ? `Freeze ${confirm.user.username}?` : `Reset ${confirm.user.username}'s password?`}</h2>
            <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.5 }}>
              {confirm.kind === "freeze"
                ? "They will be logged out of every action immediately and cannot play or use their wallet until you activate them again."
                : "A random temporary password is generated and shown once. They must choose a new one at their next login."}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="um-ghost" style={{ flex: 1 }} onClick={() => setConfirm(null)}>Cancel</button>
              <button className={confirm.kind === "freeze" ? "um-danger" : "um-primary"} style={{ flex: 1, justifyContent: "center" }} onClick={handleConfirm}>
                {confirm.kind === "freeze" ? "Freeze account" : "Reset password"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {tempPassword && <TempPasswordModal info={tempPassword} onDone={() => setTempPassword(null)} />}

      {showCreate && childRole && (
        <CreateUserWizard
          childRole={childRole}
          onClose={() => setShowCreate(false)}
          onCreate={(payload, cb) =>
            createUser.mutate({ ...payload, role: childRole }, {
              onSuccess: () => { showToast(`${payload.username} was created`); cb.onSuccess(); },
              onError: cb.onError,
            })
          }
          isPending={createUser.isPending}
        />
      )}

      {toast && (
        <div className="pop-in" role="status" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: toast.ok ? "#16301f" : "#3a1424", border: `1px solid ${toast.ok ? "rgba(61,255,154,.5)" : "rgba(255,45,120,.5)"}`, color: "#fff", padding: "12px 20px", borderRadius: 14, fontSize: 14, fontWeight: 600, boxShadow: "0 12px 40px rgba(0,0,0,.5)" }}>
          {toast.ok ? "✓ " : "⚠ "}{toast.text}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── building blocks ─────────────────────────

function Stat({ label, value, hint, color, icon }: { label: string; value: number; hint: string; color: string; icon: string }) {
  return (
    <div className="ad-card" style={{ ...card, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(255,255,255,0.05)", display: "grid", placeItems: "center", fontSize: 20, color, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{value}</div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hint}</div>
      </div>
    </div>
  );
}

function Chip({ children, active, color, onClick }: { children: ReactNode; active: boolean; color?: string; onClick: () => void }) {
  const c = color ?? GOLD;
  return (
    <button onClick={onClick} aria-pressed={active} style={{ border: `1px solid ${active ? c : "rgba(255,255,255,0.1)"}`, background: active ? `${c}22` : "rgba(255,255,255,0.03)", color: active ? c : "var(--muted-foreground)", borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
      {children}
    </button>
  );
}

function Avatar({ user, size = 46 }: { user: User; size?: number }) {
  const c = ROLE_COLORS[user.role];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${c}, ${c}55)`, display: "grid", placeItems: "center", fontWeight: 800, color: "#07070D", fontSize: size * 0.42, flexShrink: 0, position: "relative" }}>
      {user.username[0]?.toUpperCase()}
      <span title={user.status} style={{ position: "absolute", right: -1, bottom: -1, width: size * 0.28, height: size * 0.28, borderRadius: "50%", border: "2px solid #0D0D18", background: user.status === "active" ? "var(--neon-green)" : "var(--neon-pink)" }} />
    </div>
  );
}

function RolePill({ role }: { role: Role }) {
  const c = ROLE_COLORS[role];
  return <span style={{ fontSize: 11, fontWeight: 700, color: c, background: `${c}1c`, border: `1px solid ${c}33`, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>{ROLE_LABELS[role]}</span>;
}

function StatusPill({ status }: { status: User["status"] }) {
  const on = status === "active";
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: on ? "var(--neon-green)" : "var(--neon-pink)", background: on ? "rgba(61,255,154,.1)" : "rgba(255,45,120,.1)", borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>
      {on ? "● Active" : "❄ Frozen"}
    </span>
  );
}

function RowActions({ user, onToggle, onReset }: { user: User; onToggle: (u: User) => void; onReset: (u: User) => void }) {
  const on = user.status === "active";
  return (
    <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
      <button className="um-mini" onClick={() => onToggle(user)} style={{ color: on ? "var(--neon-pink)" : "var(--neon-green)" }} title={on ? "Freeze this account" : "Activate this account"}>
        {on ? "❄ Freeze" : "▶ Activate"}
      </button>
      <button className="um-mini" onClick={() => onReset(user)} style={{ color: "var(--neon-cyan)" }} title="Generate a temporary password">🔑 Reset</button>
    </div>
  );
}

interface RowHandlers {
  onSelect: (u: User) => void;
  onToggle: (u: User) => void;
  onReset: (u: User) => void;
}

function UserCard({ user, parent, delay, onSelect, onToggle, onReset }: { user: User; parent?: string; delay: number } & RowHandlers) {
  const c = ROLE_COLORS[user.role];
  return (
    <div className="um-card fade-up" style={{ animationDelay: `${delay}ms`, ["--accent" as string]: c, opacity: user.status === "frozen" ? 0.82 : 1 }} onClick={() => onSelect(user)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onSelect(user)} role="button" aria-label={`Open ${user.username}`}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Avatar user={user} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }}>
        <RolePill role={user.role} />
        <StatusPill status={user.status} />
        {user.balance !== null && <span className="font-mono-data" style={{ fontSize: 12, fontWeight: 700, color: "#FFD166", background: "rgba(255,209,102,.1)", border: "1px solid rgba(255,209,102,.25)", borderRadius: 999, padding: "3px 10px" }}>◆ {formatPoints(user.balance)}</span>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.4 }}>
          {parent ? <>Under <b style={{ color: "var(--foreground)" }}>{parent}</b><br /></> : null}
          Joined {new Date(user.createdAt).toLocaleDateString()}
        </div>
        <RowActions user={user} onToggle={onToggle} onReset={onReset} />
      </div>
    </div>
  );
}

function UserTable({ users, onSelect, onToggle, onReset }: { users: User[] } & RowHandlers) {
  return (
    <div style={{ ...card, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table className="casino-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", paddingLeft: 20 }}>Account</th>
              <th style={{ textAlign: "left" }}>ID</th>
              <th style={{ textAlign: "left" }}>Role</th>
              <th style={{ textAlign: "left" }}>Status</th>
              <th style={{ textAlign: "right" }}>Points</th>
              <th style={{ textAlign: "left" }}>Joined</th>
              <th style={{ textAlign: "right", paddingRight: 20 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ cursor: "pointer" }} onClick={() => onSelect(u)}>
                <td style={{ paddingLeft: 20 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Avatar user={u} size={36} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{u.username}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className="font-mono-data" title={u.id} style={{ fontSize: 12, color: "var(--gold-dim)" }}>{shortId(u.id)}</span></td>
                <td><RolePill role={u.role} /></td>
                <td><StatusPill status={u.status} /></td>
                <td className="font-mono-data" style={{ textAlign: "right", fontWeight: 700, color: "#FFD166" }}>{u.balance !== null ? `◆ ${formatPoints(u.balance)}` : "—"}</td>
                <td style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td style={{ paddingRight: 20 }}><div style={{ display: "flex", justifyContent: "flex-end" }}><RowActions user={u} onToggle={onToggle} onReset={onReset} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TreeNode({ user, depth, allUsers, currentUserId, onSelect, onToggle, onReset }: { user: User; depth: number; allUsers: User[]; currentUserId: string } & RowHandlers) {
  const children = allUsers.filter((u) => u.createdBy === user.id);
  const c = ROLE_COLORS[user.role];
  const isSelf = user.id === currentUserId;
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginLeft: depth > 0 ? 22 : 0 }}>
      <div className="um-tree-row" onClick={() => !isSelf && onSelect(user)} style={{ cursor: isSelf ? "default" : "pointer", borderColor: `${c}30` }}>
        {children.length > 0 ? (
          <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} aria-label={open ? "Collapse" : "Expand"} style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", width: 18, fontSize: 12, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</button>
        ) : <span style={{ width: 18 }} />}
        <Avatar user={user} size={34} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{user.username}{isSelf && <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 400 }}> (you)</span>}</div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
        </div>
        <RolePill role={user.role} />
        {!isSelf && <span className="um-tree-actions"><RowActions user={user} onToggle={onToggle} onReset={onReset} /></span>}
      </div>
      {open && children.length > 0 && (
        <div style={{ marginLeft: 16, borderLeft: `2px solid ${c}25`, paddingLeft: 6 }}>
          {children.map((ch) => <TreeNode key={ch.id} user={ch} depth={depth + 1} allUsers={allUsers} currentUserId={currentUserId} onSelect={onSelect} onToggle={onToggle} onReset={onReset} />)}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, body, action }: { icon: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div style={{ ...card, padding: "56px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--muted-foreground)" }}>{body}</p>
      {action}
    </div>
  );
}

function Modal({ children, onClose, maxWidth = 460 }: { children: ReactNode; onClose: () => void; maxWidth?: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(5,4,12,0.8)", backdropFilter: "blur(8px)", zIndex: 200, display: "grid", placeItems: "center", padding: 20, overflowY: "auto" }}>
      <div className="pop-in" style={{ ...card, background: "#100F1D", border: "1px solid rgba(255,209,102,0.22)", padding: 28, width: "100%", maxWidth }}>{children}</div>
    </div>
  );
}

// ───────────────────────── detail drawer ─────────────────────────

function UserDrawer({ user, parentName, onClose, onToggle, onReset, onSave, saving }: {
  user: User;
  parentName: string;
  onClose: () => void;
  onToggle: (u: User) => void;
  onReset: (u: User) => void;
  onSave: (id: string, payload: UpdateProfileInput, cb: { onSuccess: () => void; onError: (msg: string) => void }) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const form = useForm<UpdateProfileInput>({ resolver: zodResolver(updateProfileSchema) });
  const c = ROLE_COLORS[user.role];

  useEffect(() => {
    form.reset({ email: user.email, fullName: user.profile?.fullName ?? "", displayName: user.profile?.displayName ?? "" });
    setEditing(false);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows: [string, string][] = [
    ["Email", user.email],
    ["Full name", user.profile?.fullName ?? "—"],
    ["Display name", user.profile?.displayName ?? "—"],
    ["Created by", parentName],
    ["Joined", new Date(user.createdAt).toLocaleString()],
    ["Last updated", new Date(user.updatedAt).toLocaleString()],
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label={`${user.username} details`} onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(5,4,12,0.6)", backdropFilter: "blur(4px)", zIndex: 150, display: "flex", justifyContent: "flex-end" }}>
      <aside className="um-drawer">
        <div style={{ padding: "26px 24px 22px", background: `linear-gradient(160deg, ${c}33, transparent 70%)`, position: "relative" }}>
          <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 16, right: 16, width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#fff", cursor: "pointer", fontSize: 18 }}>×</button>
          <Avatar user={user} size={72} />
          <h2 style={{ margin: "14px 0 2px", fontSize: 24, fontWeight: 700 }}>{user.username}</h2>
          <div className="font-mono-data" style={{ fontSize: 12, color: "var(--muted-foreground)" }} title={user.id}>ID {shortId(user.id)}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}><RolePill role={user.role} /><StatusPill status={user.status} /></div>
        </div>

        <div style={{ padding: "8px 24px 24px", overflowY: "auto", flex: 1 }}>
          {editing ? (
            <form onSubmit={form.handleSubmit((d) => { setError(""); onSave(user.id, d, { onSuccess: () => setEditing(false), onError: setError }); })} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
              <FormField label="Email" error={form.formState.errors.email?.message}><input type="email" style={fieldStyle()} {...form.register("email")} /></FormField>
              <FormField label="Full name"><input style={fieldStyle()} {...form.register("fullName")} /></FormField>
              <FormField label="Display name"><input style={fieldStyle()} {...form.register("displayName")} /></FormField>
              {error && <p style={{ color: "var(--neon-pink)", fontSize: 13, margin: 0 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="um-ghost" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="um-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          ) : (
            <>
              <dl style={{ margin: "6px 0 0" }}>
                {rows.map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "13px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <dt style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{k}</dt>
                    <dd style={{ margin: 0, fontSize: 14, fontWeight: 500, textAlign: "right", wordBreak: "break-word" }}>{v}</dd>
                  </div>
                ))}
              </dl>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
                <button className="um-ghost" onClick={() => setEditing(true)}>✎ Edit profile</button>
                <button className="um-ghost" style={{ color: "var(--neon-cyan)" }} onClick={() => onReset(user)}>🔑 Reset password</button>
                {user.status === "active"
                  ? <button className="um-danger" style={{ justifyContent: "center" }} onClick={() => onToggle(user)}>❄ Freeze account</button>
                  : <button className="um-primary" style={{ justifyContent: "center" }} onClick={() => onToggle(user)}>▶ Activate account</button>}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

// ───────────────────────── temp password ─────────────────────────

function TempPasswordModal({ info, onDone }: { info: { username: string; value: string }; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(info.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — the value is still selectable on screen */ }
  };
  return (
    <Modal onClose={onDone} maxWidth={430}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>🔐</div>
        <h2 style={{ margin: "8px 0 6px", fontSize: 20 }}>Temporary password</h2>
        <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
          For <b style={{ color: "var(--foreground)" }}>{info.username}</b>. It is shown only once — copy it now and share it securely.
        </p>
        <div className="font-mono-data" style={{ background: "rgba(0,0,0,.4)", border: "1px dashed rgba(0,212,255,.5)", borderRadius: 14, padding: "16px", fontSize: 20, letterSpacing: ".08em", color: "var(--neon-cyan)", userSelect: "all", wordBreak: "break-all" }}>{info.value}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="um-ghost" style={{ flex: 1 }} onClick={copy}>{copied ? "✓ Copied" : "Copy"}</button>
          <button className="um-primary" style={{ flex: 1, justifyContent: "center" }} onClick={onDone}>Done</button>
        </div>
      </div>
    </Modal>
  );
}

// ───────────────────────── create wizard ─────────────────────────

function CreateUserWizard({ childRole, onClose, onCreate, isPending }: {
  childRole: Role;
  onClose: () => void;
  onCreate: (payload: CreateUserInput, callbacks: { onSuccess: () => void; onError: (e: Error) => void }) => void;
  isPending: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [showPw, setShowPw] = useState(false);
  const [createError, setCreateError] = useState("");
  const { register, handleSubmit, trigger, getValues, formState: { errors } } = useForm<CreateUserInput>({ resolver: zodResolver(createUserSchema) });
  const c = ROLE_COLORS[childRole];

  const goNext = async () => {
    if (await trigger(["username", "email", "password"])) setStep(2);
  };
  const onSubmit = (d: CreateUserInput) => {
    setCreateError("");
    onCreate(d, { onSuccess: onClose, onError: (e) => setCreateError(e.message) });
  };
  const values = getValues();

  return (
    <Modal onClose={onClose} maxWidth={450}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: `linear-gradient(135deg, ${c}, ${c}66)`, display: "grid", placeItems: "center", fontSize: 22, color: "#07070D" }}>＋</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Create {ROLE_LABELS[childRole]}</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Step {step} of 2 · {step === 1 ? "Login details" : "Profile (optional)"}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[1, 2].map((s) => <div key={s} style={{ flex: 1, height: 5, borderRadius: 4, background: s <= step ? "linear-gradient(90deg,#C9993A,#FFD166)" : "rgba(255,255,255,.1)", transition: "background .2s" }} />)}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: step === 1 ? "flex" : "none", flexDirection: "column", gap: 14 }}>
          <FormField label="Username" error={errors.username?.message}><input {...register("username")} placeholder="e.g. alex_chen" style={fieldStyle()} autoFocus autoComplete="off" /></FormField>
          <FormField label="Email" error={errors.email?.message}><input {...register("email")} type="email" placeholder="alex@example.com" style={fieldStyle()} autoComplete="off" /></FormField>
          <FormField label="Password" error={errors.password?.message}>
            <div style={{ position: "relative" }}>
              <input {...register("password")} type={showPw ? "text" : "password"} placeholder="At least 8 characters" style={{ ...fieldStyle(), paddingRight: 60 }} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw((s) => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: GOLD, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{showPw ? "Hide" : "Show"}</button>
            </div>
          </FormField>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="um-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="button" className="um-primary" style={{ flex: 1, justifyContent: "center" }} onClick={goNext}>Continue →</button>
          </div>
        </div>

        <div style={{ display: step === 2 ? "flex" : "none", flexDirection: "column", gap: 14 }}>
          <FormField label="Full name"><input {...register("fullName")} placeholder="Optional" style={fieldStyle()} autoComplete="off" /></FormField>
          <FormField label="Display name"><input {...register("displayName")} placeholder="Optional" style={fieldStyle()} autoComplete="off" /></FormField>
          <div style={{ background: `${c}14`, border: `1px solid ${c}33`, borderRadius: 14, padding: "12px 14px", fontSize: 13, color: "var(--muted-foreground)" }}>
            You are creating <b style={{ color: c }}>{ROLE_LABELS[childRole]}</b> <b style={{ color: "var(--foreground)" }}>{values.username}</b> ({values.email}) with their own points wallet.
          </div>
          {createError && <p style={{ color: "var(--neon-pink)", fontSize: 13, margin: 0 }}>{createError}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="um-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
            <button type="submit" className="um-primary" style={{ flex: 1, justifyContent: "center" }} disabled={isPending}>{isPending ? "Creating…" : "Create account"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 }}>{label}</span>
      {children}
      {error && <span style={{ display: "block", color: "var(--neon-pink)", fontSize: 12, marginTop: 4 }}>{error}</span>}
    </label>
  );
}

function fieldStyle(): CSSProperties {
  return { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", color: "var(--foreground)", fontSize: 14, fontFamily: "Outfit, sans-serif", outline: "none" };
}
