import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { completeGameSession, getGameHistory, listGames, playGame } from "../api/client";

export function useGames(enabled: boolean) {
  return useQuery({
    queryKey: ["games"],
    queryFn: listGames,
    enabled,
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
    },
  });
}
