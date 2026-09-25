import { z } from "zod";

export const transferSchema = z.object({
  recipientId: z.string().min(1, "Choose a recipient"),
  amount: z.coerce.number().int("Amount must be a whole number").positive("Amount must be greater than zero"),
});
export type TransferInput = z.infer<typeof transferSchema>;

export const adjustBalanceSchema = z
  .object({
    userId: z.string().min(1, "Choose a user"),
    operation: z.enum(["add", "remove", "set"]),
    amount: z.coerce.number().int("Amount must be a whole number").min(0, "Amount cannot be negative"),
    reason: z.string().min(1, "A reason is required").max(500, "Reason must be 500 characters or fewer"),
  })
  .refine((data) => data.operation === "set" || data.amount > 0, {
    message: "Amount must be greater than zero",
    path: ["amount"],
  });
export type AdjustBalanceInput = z.infer<typeof adjustBalanceSchema>;
