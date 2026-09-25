import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "../schemas/auth";
import { login, type AuthUser } from "../api/client";

interface Props {
  onLogin: (user: AuthUser) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginInput) => {
    setServerError("");
    setLoading(true);
    login(data.username, data.password)
      .then(({ user }) => onLogin(user))
      .catch((e: Error) => setServerError(e.message || "Invalid username or password."))
      .finally(() => setLoading(false));
  };

  return (
    <div className="lg-stage">
      <div className="lg-photo" />
      <div className="lg-shade" />
      <div className="lg-sparks" aria-hidden="true">
        {Array.from({ length: 16 }, (_, i) => (
          <span key={i} style={{ left: `${(i * 37 + 11) % 100}%`, animationDelay: `${(i * 0.9) % 9}s`, animationDuration: `${9 + (i % 5) * 2}s`, width: 3 + (i % 3) * 2, height: 3 + (i % 3) * 2 }} />
        ))}
      </div>

      <main style={{ position: "relative", zIndex: 2, minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px 16px" }}>
        <div className="lg-card pop-in">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
            <span className="lg-logo">♛</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "0.06em", color: "#FFD166" }}>LUCKY CROWN</div>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(237,232,216,0.55)" }}>Gaming Platform</div>
            </div>
          </div>

          <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em" }}>Welcome back</h1>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "rgba(237,232,216,0.6)" }}>Sign in with the username and password issued to your account.</p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div className="lg-field">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></svg>
                <input id="username" aria-label="Username" autoComplete="username" placeholder="Username" {...register("username")} />
              </div>
              {errors.username && <FieldError message={errors.username.message} />}
            </div>

            <div>
              <div className="lg-field">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="3" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
                <input id="password" aria-label="Password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Password" {...register("password")} />
                <button type="button" onClick={() => setShowPassword((p) => !p)} aria-label={showPassword ? "Hide password" : "Show password"} style={{ background: "none", border: "none", color: "rgba(237,232,216,0.6)", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 4 }}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && <FieldError message={errors.password.message} />}
            </div>

            {serverError && (
              <p role="alert" style={{ color: "#ff7aa5", fontSize: 13, margin: 0, padding: "10px 14px", background: "rgba(255,45,120,0.1)", borderRadius: 12, border: "1px solid rgba(255,45,120,0.25)" }}>
                {serverError}
              </p>
            )}

            <button type="submit" disabled={loading} className="lg-submit">
              <span>{loading ? "Signing in…" : "Sign in"}</span>
            </button>
          </form>

          <p style={{ margin: "22px 0 0", textAlign: "center", fontSize: 12, color: "rgba(237,232,216,0.4)" }}>
            Accounts are created by your administrator · All activity is logged
          </p>
        </div>
      </main>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p style={{ color: "#ff7aa5", fontSize: 12, margin: "6px 4px 0" }}>{message}</p>;
}
