import { z } from "zod";

export const reportFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
