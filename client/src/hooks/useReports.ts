import { useQuery } from "@tanstack/react-query";
import { getLoginReport, getPlayerActivityReport, getPointDistributionReport } from "../api/client";

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
