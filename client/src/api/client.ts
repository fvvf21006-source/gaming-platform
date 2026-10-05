// ============================================================================
// FRONTEND API CLIENT — Backend integration per docs/04_API_SPEC.md
// ============================================================================

import axios, { type AxiosInstance } from "axios";

// ── CONFIGURATION & TOKEN MANAGEMENT ──

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const TOKEN_KEY = "lucky-crown-token";

export function getToken(): string | null {
  return typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

// ── AXIOS INSTANCE ──

const http: AxiosInstance = axios.create({ baseURL: BASE_URL });

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function parseErrorBody(body: any): string {
  if (body?.errors && Array.isArray(body.errors)) {
    return body.errors.join(" ");
  }
  if (body?.error && typeof body.error === "string") {
    return body.error;
  }
  return "An unexpected error occurred.";
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      throw new Error(parseErrorBody(error.response.data));
    }
    throw new Error(error.message || "Network error — is the API reachable?");
  }
);

export async function request(path: string, init: { method?: string; body?: string } = {}) {
  const response = await http.request({
    url: path,
    method: init.method ?? "GET",
    data: init.body ? JSON.parse(init.body) : undefined,
  });
  return response.data;
}

export async function logout() {
  try {
    await request("/api/auth/logout", { method: "POST" });
  } finally {
    clearToken();
  }
}

// ── TYPE DEFINITIONS ──

import type { Role } from "../types/auth";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  status: "active" | "frozen";
  mustChangePassword: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  status: "active" | "frozen";
  /** Current points; null for accounts without a wallet (Super Admin). */
  balance: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  profile: {
    fullName: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface Wallet {
  id: string;
  userId: string;
  balance: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  senderId: string;
  recipientId: string;
  amount: string;
  senderBalanceAfter: string | null;
  recipientBalanceAfter: string | null;
  transactionType: "transfer" | "admin_add" | "admin_remove" | "admin_set";
  createdAt: string;
}

export interface Game {
  id: string;
  name: string;
  description?: string;
  pointCost: number;
  category?: string;
}

export interface GameSession {
  id: string;
  userId: string;
  playerUsername?: string;
  gameId: string;
  gameName?: string;
  pointsSpent: number;
  score: number | null;
  status: "in_progress" | "completed" | "abandoned";
  startedAt: string;
  completedAt: string | null;
  remainingBalance?: string;
  isAltered?: boolean;
  alteredBy?: string | null;
  alterationReason?: string | null;
  /** Supervisor-preset score; only present on supervisor listings. */
  forcedScore?: number | null;
}


export interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
}

export interface PointDistributionReport {
  summary: {
    totalAmount: number;
    transactionCount: number;
  };
  items: Array<{
    id: string;
    type: string;
    senderId: string;
    senderUsername: string;
    recipientId: string;
    recipientUsername: string;
    amount: string;
    createdAt: string;
  }>;
}

export interface PlayerActivityReport {
  summary: {
    sessionCount: number;
    totalPointsSpent: number;
    completed: number;
    inProgress: number;
    abandoned: number;
  };
  items: Array<{
    id: string;
    userId: string;
    username: string;
    gameId: string;
    gameName: string;
    pointsSpent: number;
    score: number | null;
    status: string;
    isAltered?: boolean;
    alteredBy?: string | null;
    alterationReason?: string | null;
    startedAt: string;
    completedAt: string | null;
  }>;
}

export interface LoginReport {
  summary: {
    successCount: number;
    failureCount: number;
  };
  items: Array<{
    id: string;
    userId: string | null;
    username: string | null;
    action: "login_success" | "login_failed";
    reason: string | null;
    attemptedUsername: string | null;
    createdAt: string;
  }>;
}

export interface AuditEntry {
  id: string;
  actorId: string | null;
  username: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

// ── AUTH API ──

export async function login(username: string, password: string) {
  const body = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  if (typeof body.token === "string" && typeof body.user === "object") {
    setToken(body.token);
    return { token: body.token, user: body.user as AuthUser };
  }
  throw new Error("Invalid login response from server.");
}

export async function fetchMe() {
  const body = await request("/api/auth/me", { method: "GET" });
  if (typeof body.user === "object") {
    return body.user as AuthUser;
  }
  throw new Error("Invalid /me response from server.");
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  return await request("/api/auth/change-password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// ── USER API ──

export async function createUser(payload: {
  username: string;
  email: string;
  password: string;
  role: Role;
  status?: string;
  fullName?: string;
  displayName?: string;
}) {
  const body = await request("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return body.user as User;
}

export async function listUsers() {
  const body = await request("/api/users", { method: "GET" });
  return body as ListResponse<User>;
}

export async function getUser(id: string) {
  const body = await request(`/api/users/${id}`, { method: "GET" });
  return body.user as User;
}

export async function updateUser(
  id: string,
  payload: {
    email?: string;
    status?: string;
    fullName?: string;
    displayName?: string;
    avatarUrl?: string;
  }
) {
  const body = await request(`/api/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return body.user as User;
}

export async function updateUserStatus(id: string, status: "active" | "frozen") {
  const body = await request(`/api/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return body.user as User;
}

export async function resetUserPassword(id: string) {
  const body = await request(`/api/users/${id}/reset-password`, {
    method: "POST",
  });
  return body.temporaryPassword as string;
}

// ── WALLET API ──

export async function getWallet() {
  const body = await request("/api/wallet", { method: "GET" });
  return body.wallet as Wallet;
}

export async function transferFunds(recipientId: string, amount: number) {
  const body = await request("/api/wallet/transfer", {
    method: "POST",
    body: JSON.stringify({ recipientId, amount }),
  });
  return body.transaction as Transaction;
}

export async function adjustBalance(
  userId: string,
  operation: "add" | "remove" | "set",
  amount: number,
  reason: string
) {
  return await request("/api/wallet/adjust", {
    method: "POST",
    body: JSON.stringify({ userId, operation, amount, reason }),
  });
}

export async function getTransactionHistory() {
  const body = await request("/api/wallet/transactions", { method: "GET" });
  return body as ListResponse<Transaction>;
}

// ── GAME API ──

export async function listGames() {
  const body = await request("/api/games", { method: "GET" });
  return body as ListResponse<Game>;
}

export async function getActiveGameSessions() {
  const body = await request("/api/games/active-sessions", { method: "GET" });
  return body as ListResponse<GameSession>;
}

export interface OnlinePlayer {
  id: string;
  username: string;
  lastSeenAt: string;
}

export async function sendHeartbeat() {
  await request("/api/presence/heartbeat", { method: "POST" });
}

export async function getOnlinePlayers() {
  const body = await request("/api/presence/online", { method: "GET" });
  return body as ListResponse<OnlinePlayer>;
}

export async function playGame(gameId: string) {
  const body = await request(`/api/games/${gameId}/play`, {
    method: "POST",
  });
  return body.session as GameSession;
}

export async function completeGameSession(sessionId: string, score: number) {
  const body = await request(`/api/games/sessions/${sessionId}/complete`, {
    method: "POST",
    body: JSON.stringify({ score }),
  });
  return body.session as GameSession;
}

export async function alterGameSession(sessionId: string, score: number = 0, reason?: string) {
  const body = await request(`/api/games/sessions/${sessionId}/alter`, {
    method: "POST",
    body: JSON.stringify({ score, reason }),
  });
  return body.session as GameSession;
}

export async function presetGameOutcome(sessionId: string, score: number) {
  const body = await request(`/api/games/sessions/${sessionId}/outcome`, {
    method: "PUT",
    body: JSON.stringify({ score }),
  });
  return body.session as GameSession;
}

export async function getGameOutcome(sessionId: string) {
  const body = await request(`/api/games/sessions/${sessionId}/outcome`, { method: "GET" });
  return body as { forcedScore: number | null };
}

export async function getGameHistory() {
  const body = await request("/api/games/history", { method: "GET" });
  return body as ListResponse<GameSession>;
}


// ── NOTIFICATION API ──

export async function getNotifications() {
  const body = await request("/api/notifications", { method: "GET" });
  return body as ListResponse<Notification>;
}

export async function markNotificationRead(notificationId: string) {
  const body = await request(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
  return body.notification as Notification;
}

export async function markAllNotificationsRead() {
  return await request("/api/notifications/read-all", { method: "PATCH" });
}

// ── REPORT API ──

export async function getPointDistributionReport(startDate?: string, endDate?: string, format?: "json"): Promise<PointDistributionReport>;
export async function getPointDistributionReport(startDate: string | undefined, endDate: string | undefined, format: "csv"): Promise<string>;
export async function getPointDistributionReport(
  startDate?: string,
  endDate?: string,
  format: "json" | "csv" = "json"
) {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  params.append("format", format);
  const path = `/api/reports/point-distribution${params.toString() ? "?" + params : ""}`;

  if (format === "csv") {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error("Failed to fetch report");
    return response.text();
  }

  const body = await request(path, { method: "GET" });
  return body as PointDistributionReport;
}

export async function getPlayerActivityReport(startDate?: string, endDate?: string, format?: "json"): Promise<PlayerActivityReport>;
export async function getPlayerActivityReport(startDate: string | undefined, endDate: string | undefined, format: "csv"): Promise<string>;
export async function getPlayerActivityReport(
  startDate?: string,
  endDate?: string,
  format: "json" | "csv" = "json"
) {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  params.append("format", format);
  const path = `/api/reports/player-activity${params.toString() ? "?" + params : ""}`;

  if (format === "csv") {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error("Failed to fetch report");
    return response.text();
  }

  const body = await request(path, { method: "GET" });
  return body as PlayerActivityReport;
}

export async function getLoginReport(startDate?: string, endDate?: string, format?: "json"): Promise<LoginReport>;
export async function getLoginReport(startDate: string | undefined, endDate: string | undefined, format: "csv"): Promise<string>;
export async function getLoginReport(
  startDate?: string,
  endDate?: string,
  format: "json" | "csv" = "json"
) {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  params.append("format", format);
  const path = `/api/reports/login${params.toString() ? "?" + params : ""}`;

  if (format === "csv") {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error("Failed to fetch report");
    return response.text();
  }

  const body = await request(path, { method: "GET" });
  return body as LoginReport;
}

// ── AUDIT API ──

export async function listAuditEntries(filters?: {
  actorId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.actorId) params.append("actorId", filters.actorId);
  if (filters?.action) params.append("action", filters.action);
  if (filters?.entityType) params.append("entityType", filters.entityType);
  if (filters?.startDate) params.append("startDate", filters.startDate);
  if (filters?.endDate) params.append("endDate", filters.endDate);

  const path = `/api/audit${params.toString() ? "?" + params : ""}`;
  const body = await request(path, { method: "GET" });
  return body as ListResponse<AuditEntry>;
}

export async function getAuditEntry(id: string) {
  const body = await request(`/api/audit/${id}`, { method: "GET" });
  return body.entry as AuditEntry;
}

export interface GameResultsReport {
  summary: {
    sessions: number;
    boughtIn: number;
    paidOut: number;
    totalWon: number;
    totalLost: number;
    houseNet: number;
    houseBalance: number;
  };
  items: Array<{
    gameName: string;
    sessions: number;
    boughtIn: number;
    paidOut: number;
    totalWon: number;
    totalLost: number;
    houseNet: number;
  }>;
}

export async function getGameResultsReport(startDate?: string, endDate?: string, format?: "json"): Promise<GameResultsReport>;
export async function getGameResultsReport(startDate: string | undefined, endDate: string | undefined, format: "csv"): Promise<string>;
export async function getGameResultsReport(startDate?: string, endDate?: string, format: "json" | "csv" = "json") {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  params.append("format", format);
  const path = `/api/reports/game-results?${params}`;

  if (format === "csv") {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${getToken() ?? ""}` },
    });
    if (!response.ok) throw new Error("Failed to export report");
    return response.text();
  }

  const body = await request(path, { method: "GET" });
  return body as GameResultsReport;
}

export interface NextOutcome {
  userId: string;
  playerUsername: string;
  gameId: string | null;
  gameName: string | null;
  score: number;
  createdAt?: string;
}

export async function presetNextOutcome(playerId: string, score: number, gameId?: string) {
  const body = await request(`/api/games/players/${playerId}/next-outcome`, {
    method: "PUT",
    body: JSON.stringify({ score, gameId }),
  });
  return body.outcome as NextOutcome;
}

export async function clearNextOutcome(playerId: string) {
  await request(`/api/games/players/${playerId}/next-outcome`, { method: "DELETE" });
}

export async function getNextOutcomes() {
  const body = await request("/api/games/next-outcomes", { method: "GET" });
  return body as ListResponse<NextOutcome>;
}
