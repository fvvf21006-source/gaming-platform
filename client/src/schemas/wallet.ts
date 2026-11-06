import { z } from "zod";

const pointAmount = z.coerce.number().finite().nonnegative().refine(
  (value) => Number.isSafeInteger(Math.round(value * 100)) && Math.round(value * 100) / 100 === value,
  "Amount must have at most two decimal places",
);

export const transferSchema = z.object({
  recipientId: z.string().min(1, "Choose a recipient"),
  amount: pointAmount.refine((value) => value > 0, "Amount must be greater than zero"),
});
export type TransferInput = z.infer<typeof transferSchema>;

export const adjustBalanceSchema = z
  .object({
    userId: z.string().min(1, "Choose a user"),
    operation: z.enum(["add", "remove", "set"]),
    amount: pointAmount,
    reason: z.string().min(1, "A reason is required").max(500, "Reason must be 500 characters or fewer"),
  })
  .refine((data) => data.operation === "set" || data.amount > 0, {
    message: "Amount must be greater than zero",
    path: ["amount"],
  });
export type AdjustBalanceInput = z.infer<typeof adjustBalanceSchema>;
