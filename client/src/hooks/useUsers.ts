import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  getUser,
  getPlayerOverview,
  listUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus,
  type User,
} from "../api/client";
import type { Role } from "../types/auth";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => getUser(id as string),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      username: string;
      email: string;
      password: string;
      role: Role;
      fullName?: string;
      displayName?: string;
    }) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { email?: string; fullName?: string; displayName?: string; avatarUrl?: string };
    }) => updateUser(id, payload),
    onSuccess: (updated: User) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.setQueryData(["users", updated.id], updated);
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "frozen" }) =>
      updateUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (id: string) => resetUserPassword(id),
  });
}

export function usePlayerOverview(playerId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["users", "overview", playerId],
    queryFn: () => getPlayerOverview(playerId as string),
    enabled: enabled && Boolean(playerId),
    refetchInterval: 15_000,
  });
}
