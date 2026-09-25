import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordInput } from "../schemas/auth";
import { changePassword } from "../api/client";
import { useState } from "react";

interface Props {
  onChanged: () => void;
  onLogout: () => void;
}

export default function ForcedPasswordChange({ onChanged, onLogout }: Props) {
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = (data: ChangePasswordInput) => {
    setServerError("");
    setSubmitting(true);
    changePassword(data.currentPassword, data.newPassword)
      .then(() => onChanged())
      .catch((e: Error) => setServerError(e.message))
      .finally(() => setSubmitting(false));
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card-glow" style={{ width: "100%", maxWidth: 420, background: "rgba(15,15,26,0.97)", border: "1px solid rgba(255,209,102,0.25)", borderRadius: 18, padding: "34px 30px" }}>
        <h2 className="font-cinzel" style={{ fontSize: 18, fontWeight: 700, color: "#FFD166", margin: "0 0 6px" }}>Password Change Required</h2>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 22px", lineHeight: 1.5 }}>
          An administrator reset your password. Set a new password before continuing.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle()}>Temporary / current password</label>
            <input type="password" autoComplete="current-password" style={inputStyle()} {...register("currentPassword")} />
            {errors.currentPassword && <FieldError message={errors.currentPassword.message} />}
          </div>
          <div>
            <label style={labelStyle()}>New password (min 8 characters)</label>
            <input type="password" autoComplete="new-password" style={inputStyle()} {...register("newPassword")} />
            {errors.newPassword && <FieldError message={errors.newPassword.message} />}
          </div>

          {serverError && (
            <p style={{ color: "var(--neon-pink)", fontSize: 13, margin: 0, padding: "8px 12px", background: "rgba(255,45,120,0.07)", borderRadius: 6, border: "1px solid rgba(255,45,120,0.18)" }}>
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ background: "linear-gradient(135deg, #C9993ACC, #FFD166)", border: "none", borderRadius: 10, padding: "12px", color: "#07070D", fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: submitting ? "not-allowed" : "pointer" }}
          >
            {submitting ? "Updating..." : "Update Password"}
          </button>
          <button
            type="button"
            onClick={onLogout}
            style={{ background: "none", border: "none", color: "var(--muted-foreground)", fontSize: 13, cursor: "pointer", padding: 4 }}
          >
            Sign out instead
          </button>
        </form>
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p style={{ color: "var(--neon-pink)", fontSize: 12, margin: "5px 0 0" }}>{message}</p>;
}

function labelStyle(): React.CSSProperties {
  return { display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 6 };
}

function inputStyle(): React.CSSProperties {
  return { width: "100%", background: "rgba(7,7,13,0.8)", border: "1px solid rgba(201,153,58,0.2)", borderRadius: 8, padding: "11px 13px", color: "var(--foreground)", fontSize: 14, outline: "none" };
}
