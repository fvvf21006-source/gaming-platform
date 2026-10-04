import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeGameSession,
  getGameHistory,
  listGames,
  playGame,
  getActiveGameSessions,
  alterGameSession,
  getOnlinePlayers,
} from "../api/client";

export function useGames(enabled: boolean) {
  return useQuery({
    queryKey: ["games"],
    queryFn: listGames,
    enabled,
  });
}

export function useActiveGameSessions(enabled: boolean) {
  return useQuery({
    queryKey: ["games", "active-sessions"],
    queryFn: getActiveGameSessions,
    enabled,
    refetchInterval: 3000, // Poll every 3 seconds for live monitoring
  });
}

export function useOnlinePlayers(enabled: boolean) {
  return useQuery({
    queryKey: ["presence", "online"],
    queryFn: getOnlinePlayers,
    enabled,
    refetchInterval: 10000,
  });
}

export function useGameHistory(enabled: boolean) {
  return useQuery({
    queryKey: ["games", "history"],
    queryFn: getGameHistory,
    enabled,
  });
}

export function usePlayGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gameId: string) => playGame(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["games", "active-sessions"] });
    },
  });
}

export function useCompleteGameSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, score }: { sessionId: string; score: number }) =>
      completeGameSession(sessionId, score),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games", "history"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["games", "active-sessions"] });
    },
  });
}

export function useAlterGameSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, score = 0, reason }: { sessionId: string; score?: number; reason?: string }) =>
      alterGameSession(sessionId, score, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games", "active-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}
