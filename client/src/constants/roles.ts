import type { Role } from "../types/auth";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  level_1: "Level 1",
  level_2: "Level 2",
  level_3: "Level 3",
  player: "Player",
};

export const ROLE_COLORS: Record<Role, string> = {
  super_admin: "#FFD166",
  level_1: "#C9993A",
  level_2: "#00D4FF",
  level_3: "#3DFF9A",
  player: "#FF2D78",
};

// BR-1..BR-6 — the tier each role is permitted to create directly beneath it.
export const CHILD_ROLE: Record<Role, Role | null> = {
  super_admin: "level_1",
  level_1: "level_2",
  level_2: "level_3",
  level_3: "player",
  player: null,
};

export const ROLE_ORDER: Role[] = ["super_admin", "level_1", "level_2", "level_3", "player"];

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as Role] ?? role;
}

export function roleColor(role: string): string {
  return ROLE_COLORS[role as Role] ?? "#9A94A8";
}
