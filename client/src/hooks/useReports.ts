import { useQuery } from "@tanstack/react-query";
import { getGameResultsReport, getLoginReport, getPlayerActivityReport, getPointDistributionReport } from "../api/client";

export function usePointDistributionReport(enabled: boolean, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["reports", "point-distribution", startDate, endDate],
    queryFn: () => getPointDistributionReport(startDate, endDate),
    enabled,
  });
}

export function usePlayerActivityReport(enabled: boolean, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["reports", "player-activity", startDate, endDate],
    queryFn: () => getPlayerActivityReport(startDate, endDate),
    enabled,
  });
}

export function useLoginReport(enabled: boolean, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["reports", "login", startDate, endDate],
    queryFn: () => getLoginReport(startDate, endDate),
    enabled,
  });
}

export function useGameResultsReport(enabled: boolean, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["reports", "game-results", startDate, endDate],
    queryFn: () => getGameResultsReport(startDate, endDate),
    enabled,
    // Players are winning and losing continuously, so keep the totals fresh.
    refetchInterval: 30_000,
  });
}
