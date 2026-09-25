import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthUser, Transaction } from "../api/client";
import { can } from "../utils/permissions";
import { formatPoints } from "../utils/points";
import { shortId } from "../utils/format";
import { transferSchema, adjustBalanceSchema, type TransferInput, type AdjustBalanceInput } from "../schemas/wallet";
import { useUsers } from "../hooks/useUsers";
import { useWallet, useTransactionHistory, useTransferPoints, useAdjustBalance } from "../hooks/useWallet";

interface Props {
  currentUser: AuthUser;
}

type TxType = Transaction["transactionType"];

const TX_META: Record<TxType, { label: string; color: string; icon: string }> = {
  transfer: { label: "Transfer", color: "#FFD166", icon: "➤" },
  admin_add: { label: "Admin add", color: "#3DFF9A", icon: "＋" },
  admin_remove: { label: "Admin remove", color: "#FF2D78", icon: "−" },
  admin_set: { label: "Admin set", color: "#00D4FF", icon: "＝" },
};

const QUICK_AMOUNTS = [10, 50, 100, 500];

const card: CSSProperties = {
  background: "linear-gradient(180deg, rgba(20,19,34,0.96), rgba(13,13,24,0.96))",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 22,
  boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
};

export default function WalletPanel({ currentUser }: Props) {
  const isSuperAdmin = currentUser.role === "super_admin";
  const canTransfer = can(currentUser.role, "wallet.transfer");
  const canAdjust = can(currentUser.role, "wallet.adjust");

  const { data: usersData } = useUsers();
  const { data: wallet } = useWallet(!isSuperAdmin);
  const { data: txData } = useTransactionHistory(!isSuperAdmin);
  const transferMutation = useTransferPoints();
  const adjustMutation = useAdjustBalance();
  const [typeFilter, setTypeFilter] = useState<"all" | TxType>("all");

  const users = usersData?.items ?? [];
  const directChildren = users.filter((u) => u.createdBy === currentUser.id);
  const adjustTargets = users.filter((u) => u.id !== currentUser.id && u.role !== "super_admin");
  const resolveName = (id: string) => users.find((u) => u.id === id)?.username ?? (id === currentUser.id ? "You" : shortId(id));

  const transferForm = useForm<TransferInput>({ resolver: zodResolver(transferSchema) });
  const adjustForm = useForm<AdjustBalanceInput>({ resolver: zodResolver(adjustBalanceSchema), defaultValues: { operation: "add" } });

  const showBothModes = canTransfer && canAdjust;
  const [mode, setMode] = useState<"transfer" | "adjust">(canTransfer ? "transfer" : "adjust");

  const onTransfer = (data: TransferInput) => {
    transferMutation.mutate({ recipientId: data.recipientId, amount: data.amount }, { onSuccess: () => transferForm.reset() });
  };
  const onAdjust = (data: AdjustBalanceInput) => {
    adjustMutation.mutate(
      { userId: data.userId, operation: data.operation, amount: data.amount, reason: data.reason },
      { onSuccess: () => adjustForm.reset({ operation: "add" }) }
    );
  };

  const allTx = txData?.items ?? [];
  const { received, sent } = useMemo(() => {
    let r = 0, s = 0;
    for (const t of allTx) {
      const amt = Number(t.amount);
      if (t.recipientId === currentUser.id) r += amt;
      if (t.senderId === currentUser.id) s += amt;
    }
    return { received: r, sent: s };
  }, [allTx, currentUser.id]);
  const shown = allTx.filter((t) => typeFilter === "all" || t.transactionType === typeFilter);
  const watchedAmount = transferForm.watch("amount");
  const balance = Number(wallet?.balance ?? 0);
  const overBalance = !isSuperAdmin && Number(watchedAmount) > balance;

  return (
    <div style={{ padding: "24px 28px 48px", fontFamily: "'Outfit',sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em" }}>Wallet & points</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--muted-foreground)" }}>Points move down the hierarchy only — every movement is logged.</p>
      </div>

      <div className="wl-layout">
        {/* ───────── left: balance + ledger ───────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          <div className="wl-hero">
            <div className="wl-wallet">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em" }}>
                <span>POINTS BALANCE</span>
                <span>👑</span>
              </div>
              <div style={{ fontSize: isSuperAdmin ? 40 : 52, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05, margin: "26px 0 6px" }}>
                {isSuperAdmin ? "Unlimited" : <>◆ {formatPoints(wallet?.balance)}</>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.75 }}>
                {isSuperAdmin ? "Super Admin has no wallet — no limit applies" : `${currentUser.username} · available to send & play`}
              </div>
            </div>

            <div className="wl-mini">
              <MiniStat label="Received" value={isSuperAdmin ? "—" : `+${formatPoints(received)}`} color="var(--neon-green)" icon="↓" />
              <MiniStat label="Sent" value={isSuperAdmin ? "—" : `−${formatPoints(sent)}`} color="var(--neon-pink)" icon="↑" />
              <MiniStat label="Transactions" value={isSuperAdmin ? "—" : String(allTx.length)} color="#FFD166" icon="⇄" />
            </div>
          </div>

          {!isSuperAdmin && (
            <div style={{ ...card, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>Transaction history</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{shown.length} of {allTx.length} shown</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(["all", "transfer", "admin_add", "admin_remove", "admin_set"] as const).map((f) => (
                    <button key={f} onClick={() => setTypeFilter(f)} aria-pressed={typeFilter === f} className={`wl-chip ${typeFilter === f ? "on" : ""}`}>
                      {f === "all" ? "All" : TX_META[f].label}
                    </button>
                  ))}
                </div>
              </div>

              {shown.length === 0 ? (
                <div style={{ padding: "40px 10px", textAlign: "center", color: "var(--muted-foreground)" }}>
                  <div style={{ fontSize: 38, marginBottom: 6 }}>🧾</div>
                  {typeFilter === "all" ? "No transactions yet." : "No transactions match this filter."}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {shown.map((t) => {
                    const meta = TX_META[t.transactionType];
                    const outgoing = t.senderId === currentUser.id;
                    return (
                      <div key={t.id} className="wl-row">
                        <div style={{ width: 42, height: 42, borderRadius: 14, background: `${meta.color}1c`, color: meta.color, display: "grid", placeItems: "center", fontSize: 18, fontWeight: 800, flexShrink: 0 }}>{meta.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {resolveName(t.senderId)} <span style={{ color: "var(--muted-foreground)" }}>→</span> {resolveName(t.recipientId)}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                            <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span> · {new Date(t.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: outgoing ? "var(--neon-pink)" : "var(--neon-green)" }}>{outgoing ? "−" : "+"}{formatPoints(t.amount)}</div>
                          <div className="font-mono-data" title={t.id} style={{ fontSize: 10, color: "var(--muted-foreground)" }}>#{shortId(t.id)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ───────── right: move points ───────── */}
        {(canTransfer || canAdjust) && (
          <div style={{ ...card, padding: 22, alignSelf: "start" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Move points</div>
              {showBothModes && (
                <div className="um-seg" role="tablist" aria-label="Mode">
                  {(["transfer", "adjust"] as const).map((m) => (
                    <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)} style={{ padding: "6px 12px" }}>
                      {m === "transfer" ? "Send" : "Adjust"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {mode === "transfer" ? (
              <form onSubmit={transferForm.handleSubmit(onTransfer)} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>Send points to an account you created directly.</p>
                <Field label="Recipient" error={transferForm.formState.errors.recipientId?.message}>
                  <select {...transferForm.register("recipientId")} className="wl-input">
                    <option value="">Choose an account…</option>
                    {directChildren.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                </Field>
                <Field label="Amount" error={transferForm.formState.errors.amount?.message}>
                  <input type="number" min={1} step={1} placeholder="0" className="wl-input wl-amount" {...transferForm.register("amount")} />
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {QUICK_AMOUNTS.map((n) => (
                      <button key={n} type="button" className="wl-chip" onClick={() => transferForm.setValue("amount", n as never, { shouldValidate: true })}>+{n}</button>
                    ))}
                  </div>
                </Field>
                {overBalance && <Notice tone="warn">That is more than your balance of {formatPoints(balance)} points.</Notice>}
                {transferMutation.isError && <Notice tone="error">{(transferMutation.error as Error).message}</Notice>}
                {transferMutation.isSuccess && <Notice tone="ok">✓ Transfer completed.</Notice>}
                <button type="submit" className="um-primary" style={{ justifyContent: "center" }} disabled={directChildren.length === 0 || transferMutation.isPending}>
                  {transferMutation.isPending ? "Sending…" : "Send points ➤"}
                </button>
                {directChildren.length === 0 && <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>You have no direct accounts to send to yet. Create one from the Users page.</p>}
              </form>
            ) : (
              <form onSubmit={adjustForm.handleSubmit(onAdjust)} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>Add, remove or set a balance for anyone in your hierarchy. A reason is required and it is always audited.</p>
                <Field label="Account" error={adjustForm.formState.errors.userId?.message}>
                  <select {...adjustForm.register("userId")} className="wl-input">
                    <option value="">Choose an account…</option>
                    {adjustTargets.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                </Field>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Field label="Operation">
                      <select {...adjustForm.register("operation")} className="wl-input">
                        <option value="add">Add (+)</option>
                        <option value="remove">Remove (−)</option>
                        <option value="set">Set (=)</option>
                      </select>
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="Amount" error={adjustForm.formState.errors.amount?.message}>
                      <input type="number" min={0} step={1} placeholder="0" className="wl-input wl-amount" {...adjustForm.register("amount")} />
                    </Field>
                  </div>
                </div>
                <Field label="Reason" error={adjustForm.formState.errors.reason?.message}>
                  <input type="text" placeholder="Why is this change needed?" className="wl-input" {...adjustForm.register("reason")} />
                </Field>
                {adjustMutation.isError && <Notice tone="error">{(adjustMutation.error as Error).message}</Notice>}
                {adjustMutation.isSuccess && <Notice tone="ok">✓ Adjustment applied.</Notice>}
                <button type="submit" className="um-primary" style={{ justifyContent: "center" }} disabled={adjustTargets.length === 0 || adjustMutation.isPending}>
                  {adjustMutation.isPending ? "Applying…" : "Apply adjustment"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div className="ad-card" style={{ ...card, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.05)", color, display: "grid", placeItems: "center", fontSize: 17, fontWeight: 800, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: "-0.01em" }}>{value}</div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 }}>{label}</label>
      {children}
      {error && <p style={{ color: "var(--neon-pink)", fontSize: 12, margin: "5px 0 0" }}>{error}</p>}
    </div>
  );
}

function Notice({ tone, children }: { tone: "ok" | "warn" | "error"; children: ReactNode }) {
  const c = tone === "ok" ? "61,255,154" : tone === "warn" ? "255,209,102" : "255,45,120";
  return <div role={tone === "error" ? "alert" : "status"} style={{ fontSize: 13, padding: "10px 14px", borderRadius: 12, color: `rgb(${c})`, background: `rgba(${c},0.1)`, border: `1px solid rgba(${c},0.3)` }}>{children}</div>;
}
