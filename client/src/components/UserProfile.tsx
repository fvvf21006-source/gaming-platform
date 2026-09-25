import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthUser } from "../api/client";
import { ROLE_COLORS, ROLE_LABELS } from "../constants/roles";
import { updateProfileSchema, type UpdateProfileInput } from "../schemas/users";
import { changePasswordSchema, type ChangePasswordInput } from "../schemas/auth";
import { useUser, useUpdateUser } from "../hooks/useUsers";
import { changePassword } from "../api/client";

interface Props {
  currentUser: AuthUser;
  onUpdated: (user: AuthUser) => void;
}

export default function UserProfile({ currentUser, onUpdated }: Props) {
  const { data: profile } = useUser(currentUser.id);
  const updateUser = useUpdateUser();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const roleColor = ROLE_COLORS[currentUser.role];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateProfileInput>({ resolver: zodResolver(updateProfileSchema) });

  useEffect(() => {
    if (profile) {
      reset({
        email: profile.email,
        fullName: profile.profile?.fullName ?? "",
        displayName: profile.profile?.displayName ?? "",
      });
    }
  }, [profile, reset]);

  const onSave = (data: UpdateProfileInput) => {
    updateUser.mutate(
      { id: currentUser.id, payload: data },
      {
        onSuccess: (updated) => {
          setEditing(false);
          setSaved(true);
          onUpdated({ ...currentUser, email: updated.email });
          setTimeout(() => setSaved(false), 3000);
        },
      }
    );
  };

  return (
    <div style={{ padding: "26px 30px", display: "flex", flexDirection: "column", gap: 26 }}>
      <div
        className="card-glow"
        style={{ background: "linear-gradient(135deg, #0F0F1A 0%, #160F1A 100%)", border: `1px solid ${roleColor}30`, borderRadius: 16, padding: "28px 30px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", position: "relative", overflow: "hidden" }}
      >
        <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${roleColor}08 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${roleColor}40, ${roleColor}20)`, border: `2px solid ${roleColor}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: roleColor, flexShrink: 0, boxShadow: `0 0 20px ${roleColor}25` }}>
          {currentUser.role === "super_admin" ? "♛" : currentUser.role === "player" ? "♠" : "◈"}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 className="font-cinzel" style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: "0 0 4px", letterSpacing: "0.03em" }}>
            {currentUser.username}
          </h1>
          <div className="font-mono-data" style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 10 }}>ID: {currentUser.id}</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: roleColor, background: `${roleColor}18`, borderRadius: 5, padding: "3px 10px", letterSpacing: "0.08em", textTransform: "uppercase", border: `1px solid ${roleColor}35` }}>
            {ROLE_LABELS[currentUser.role]}
          </span>
        </div>
        {profile && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 5 }}>Member Since</div>
            <div className="font-mono-data" style={{ fontSize: 16, color: "var(--foreground)" }}>{new Date(profile.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</div>
          </div>
        )}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.15)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(201,153,58,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--gold)" }}>◯</span>
            <span className="font-cinzel" style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.05em" }}>Account Details</span>
          </div>
          {saved && <span style={{ fontSize: 13, color: "var(--neon-green)" }}>● Saved</span>}
        </div>

        {profile && (
          <form onSubmit={handleSubmit(onSave)} style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <ReadOnlyField label="Username" value={profile.username} mono />
            <ReadOnlyField label="Role" value={ROLE_LABELS[profile.role]} color={roleColor} />
            <ReadOnlyField label="Status" value={profile.status.toUpperCase()} color={profile.status === "active" ? "var(--neon-green)" : "var(--neon-pink)"} />
            <ReadOnlyField label="Created" value={new Date(profile.createdAt).toLocaleDateString()} />

            <EditableField label="Email" editing={editing} error={errors.email?.message} value={profile.email}>
              <input {...register("email")} style={editInputStyle()} />
            </EditableField>
            <EditableField label="Full Name" editing={editing} value={profile.profile?.fullName ?? "—"}>
              <input {...register("fullName")} style={editInputStyle()} />
            </EditableField>
            <EditableField label="Display Name" editing={editing} value={profile.profile?.displayName ?? "—"}>
              <input {...register("displayName")} style={editInputStyle()} />
            </EditableField>

            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, marginTop: 4 }}>
              {editing ? (
                <>
                  <button type="submit" disabled={updateUser.isPending} style={{ background: "linear-gradient(135deg, #C9993A, #FFD166)", border: "none", borderRadius: 8, padding: "9px 20px", color: "#07070D", fontSize: 14, fontWeight: 700, fontFamily: "Outfit, sans-serif", cursor: "pointer" }}>
                    {updateUser.isPending ? "Saving..." : "Save Changes"}
                  </button>
                  <button type="button" onClick={() => { setEditing(false); reset(); }} style={{ background: "transparent", border: "1px solid rgba(201,153,58,0.22)", borderRadius: 8, padding: "9px 20px", color: "var(--muted-foreground)", fontSize: 14, fontFamily: "Outfit, sans-serif", cursor: "pointer" }}>Cancel</button>
                </>
              ) : (
                <button type="button" onClick={() => setEditing(true)} style={{ background: "transparent", border: "1px solid rgba(201,153,58,0.3)", borderRadius: 8, padding: "9px 20px", color: "var(--gold-dim)", fontSize: 14, fontFamily: "Outfit, sans-serif", cursor: "pointer" }}>Edit Profile</button>
              )}
            </div>
          </form>
        )}
      </div>

      <ChangePasswordCard />

      <div style={{ background: "rgba(201,153,58,0.04)", border: "1px solid rgba(201,153,58,0.1)", borderRadius: 10, padding: "14px 18px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ color: "var(--gold)", fontSize: 16, marginTop: 1 }}>◉</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 3 }}>Security Reminder</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
            Your password is securely hashed and never stored in plain text. All activity on this account is fully logged and audited.
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (data: ChangePasswordInput) => {
    setServerError("");
    try {
      await changePassword(data.currentPassword, data.newPassword);
      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setServerError((e as Error).message);
    }
  };

  return (
    <div style={{ background: "var(--card)", border: "1px solid rgba(201,153,58,0.15)", borderRadius: 14, padding: "20px" }}>
      <h3 className="font-cinzel" style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: "0 0 16px" }}>Change Password</h3>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, alignItems: "start" }}>
        <div>
          <input type="password" placeholder="Current password" style={editInputStyle()} {...register("currentPassword")} />
          {errors.currentPassword && <FieldError message={errors.currentPassword.message} />}
        </div>
        <div>
          <input type="password" placeholder="New password (min 8 chars)" style={editInputStyle()} {...register("newPassword")} />
          {errors.newPassword && <FieldError message={errors.newPassword.message} />}
        </div>
        <button type="submit" disabled={isSubmitting} style={{ background: "rgba(201,153,58,0.15)", border: "1px solid rgba(201,153,58,0.4)", borderRadius: 8, padding: "9px 16px", color: "var(--gold)", fontSize: 13, fontWeight: 700, cursor: "pointer", height: 38 }}>
          {isSubmitting ? "Updating..." : "Update Password"}
        </button>
      </form>
      {serverError && <p style={{ color: "var(--neon-pink)", fontSize: 13, margin: "10px 0 0" }}>{serverError}</p>}
      {success && <p style={{ color: "var(--neon-green)", fontSize: 13, margin: "10px 0 0" }}>Password updated.</p>}
    </div>
  );
}

function ReadOnlyField({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div style={{ background: "rgba(7,7,13,0.5)", borderRadius: 8, padding: "12px 14px", border: "1px solid rgba(201,153,58,0.07)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 14, fontFamily: mono ? "'JetBrains Mono', monospace" : "Outfit, sans-serif", color: color ?? "var(--foreground)", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function EditableField({ label, editing, error, value, children }: { label: string; editing: boolean; error?: string; value: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(7,7,13,0.5)", borderRadius: 8, padding: "12px 14px", border: "1px solid rgba(201,153,58,0.07)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 5 }}>{label}</div>
      {editing ? children : <div style={{ fontSize: 14, color: "var(--foreground)" }}>{value}</div>}
      {error && <FieldError message={error} />}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p style={{ color: "var(--neon-pink)", fontSize: 12, margin: "4px 0 0" }}>{message}</p>;
}

function editInputStyle(): React.CSSProperties {
  return { width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(201,153,58,0.4)", color: "var(--foreground)", fontSize: 14, fontFamily: "Outfit, sans-serif", outline: "none", padding: "2px 0" };
}
