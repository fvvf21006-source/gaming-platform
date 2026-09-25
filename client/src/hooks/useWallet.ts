import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adjustBalance, getTransactionHistory, getWallet, transferFunds } from "../api/client";

export function useWallet(enabled: boolean) {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: getWallet,
    enabled,
    retry: false,
  });
}

export function useTransactionHistory(enabled: boolean) {
  return useQuery({
    queryKey: ["wallet", "transactions"],
    queryFn: getTransactionHistory,
    enabled,
  });
}

export function useTransferPoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipientId, amount }: { recipientId: string; amount: number }) =>
      transferFunds(recipientId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useAdjustBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      operation,
      amount,
      reason,
    }: {
      userId: string;
      operation: "add" | "remove" | "set";
      amount: number;
      reason: string;
    }) => adjustBalance(userId, operation, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
