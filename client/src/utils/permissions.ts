import type { Role } from "../types/auth";

export type Permission =
  | "users.view"
  | "users.create"
  | "users.freeze"
  | "wallet.view"
  | "wallet.transfer"
  | "wallet.adjust"
  | "game.play"
  | "game.alter"
  | "reports.playerActivity"
  | "reports.view"
  | "reports.loginReport"
  | "reports.gameResults"
  | "audit.view";

const ADMIN_ROLES: Role[] = ["super_admin", "level_1", "level_2", "level_3"];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [
    "users.view",
    "users.create",
    "users.freeze",
    "wallet.view",
    "wallet.transfer",
    "wallet.adjust",
    "reports.view",
    "reports.playerActivity",
    "reports.loginReport",
    "reports.gameResults",
    "audit.view",
  ],
  level_1: ["users.view", "users.create", "users.freeze", "wallet.view", "wallet.transfer", "wallet.adjust", "reports.view"],
  level_2: ["users.view", "users.create", "users.freeze", "wallet.view", "wallet.transfer", "wallet.adjust", "reports.view"],
  level_3: ["users.view", "users.create", "users.freeze", "wallet.view", "wallet.transfer", "wallet.adjust", "game.alter", "reports.view", "reports.playerActivity"],
  player: ["wallet.view", "game.play"],
};


export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isAdminRole(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}
