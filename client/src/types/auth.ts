export type Role = "super_admin" | "level_1" | "level_2" | "level_3" | "player";

export interface UserProfile {
  fullName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  status: "active" | "frozen";
  mustChangePassword: boolean;
}
