import { z } from "zod";
import {
  diffLocalDays,
  isValidLocalDate,
  MAX_RANGE_DAYS,
} from "./range";
import { ApiError } from "./response";

export const granularitySchema = z.enum(["day", "week", "month"]);
export type Granularity = z.infer<typeof granularitySchema>;

export const formatSchema = z.enum(["json", "csv"]).default("json");
export type ReportFormat = z.infer<typeof formatSchema>;

export const orderStatusValues = [
  "INGRESADO",
  "ENTREGADO",
  "ANULADO",
] as const;
export type OrderStatusValue = (typeof orderStatusValues)[number];

const localDate = z
  .string()
  .refine((v) => isValidLocalDate(v), {
    message: "Debe tener formato YYYY-MM-DD y ser una fecha válida.",
  })
  .transform((v) => {
    const [year, month, day] = v.split("-").map(Number);
    return { year, month, day };
  });

type LocalDateParts = { year: number; month: number; day: number };

/** Valida el rango ya parseado (coherencia de fechas y tope de duración). */
export function assertRange(q: { from: LocalDateParts; to: LocalDateParts }): void {
  if (diffLocalDays(q.from, q.to) < 0) {
    throw new ApiError(
      "INVALID_DATE_RANGE",
      "'from' debe ser anterior o igual a 'to'.",
    );
  }
  if (diffLocalDays(q.from, q.to) > MAX_RANGE_DAYS) {
    throw new ApiError(
      "DATE_RANGE_TOO_LARGE",
      RANGE_TOO_LARGE_MESSAGE,
    );
  }
}

function rangeObject<Extra extends z.ZodRawShape>(extra: Extra) {
  return z.object({
    from: localDate,
    to: localDate,
    ...extra,
  });
}

export const dailyQuerySchema = z.object({
  date: localDate.optional(),
  format: formatSchema,
});

export const salesRangeQuerySchema = rangeObject({
  granularity: granularitySchema.default("day"),
  status: z.enum(orderStatusValues).optional(),
  format: formatSchema,
});

export const peakHoursQuerySchema = rangeObject({
  weekday: z.coerce.number().int().min(0).max(6).optional(),
  format: formatSchema,
});

export const categorySalesQuerySchema = rangeObject({ format: formatSchema });

export const topProductsQuerySchema = rangeObject({
  groupBy: z
    .enum(["drink", "flavor", "size", "bobaType", "topping"])
    .default("flavor"),
  metric: z.enum(["quantity", "revenue"]).default("quantity"),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  format: formatSchema,
});

const boolParam = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === "" ? defaultValue : v === "true",
    );

export const slowMoversQuerySchema = rangeObject({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  includeZero: boolParam(true),
  toppings: boolParam(false),
  format: formatSchema,
});

export const staffPerformanceQuerySchema = rangeObject({
  userId: z.string().min(1).optional(),
  format: formatSchema,
});

export const adjustmentsQuerySchema = rangeObject({
  type: z.enum(["discount", "cancellation", "all"]).default("all"),
  userId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  format: formatSchema,
});

export type DailyQuery = z.infer<typeof dailyQuerySchema>;
export type SalesRangeQuery = z.infer<typeof salesRangeQuerySchema>;
export type PeakHoursQuery = z.infer<typeof peakHoursQuerySchema>;
export type CategorySalesQuery = z.infer<typeof categorySalesQuerySchema>;
export type TopProductsQuery = z.infer<typeof topProductsQuerySchema>;
export type SlowMoversQuery = z.infer<typeof slowMoversQuerySchema>;
export type StaffPerformanceQuery = z.infer<typeof staffPerformanceQuerySchema>;
export type AdjustmentsQuery = z.infer<typeof adjustmentsQuerySchema>;

export function parseSearchParams(
  searchParams: URLSearchParams,
): Record<string, string> {
  const out: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export const RANGE_TOO_LARGE_MESSAGE =
  "El rango de fechas no puede superar los 366 días.";
