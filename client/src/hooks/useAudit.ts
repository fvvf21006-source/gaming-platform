import { useQuery } from "@tanstack/react-query";
import { listAuditEntries } from "../api/client";

export function useAuditLog(
  enabled: boolean,
  filters?: { actorId?: string; action?: string; entityType?: string; startDate?: string; endDate?: string }
) {
  return useQuery({
    queryKey: ["audit", filters],
    queryFn: () => listAuditEntries(filters),
    enabled,
  });
}
