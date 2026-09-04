import type { ReportMeta } from "@bbspos/types";
import { ZodError } from "zod";

export const ERROR_CODES = {
  INVALID_PARAMETER: 400,
  MISSING_PARAMETER: 400,
  INVALID_DATE_RANGE: 400,
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  DATE_RANGE_TOO_LARGE: 422,
  NOT_IMPLEMENTED_SCHEMA: 501,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.status = ERROR_CODES[code];
  }
}

export function reportEnvelope<T>(
  report: string,
  from: Date,
  to: Date,
  data: T,
): { data: T; meta: ReportMeta } {
  return {
    data,
    meta: {
      report,
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      currency: "BOB",
    },
  };
}

export function jsonOk<T>(body: { data: T; meta: ReportMeta }): Response {
  return Response.json(body);
}

export function errorBody(code: ErrorCode, message: string) {
  return { error: { code, message } };
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(errorBody(error.code, error.message), {
      status: error.status,
    });
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const field = first?.path?.join(".");
    return Response.json(
      errorBody(
        "INVALID_PARAMETER",
        `Parámetro inválido${field ? ` '${field}'` : ""}: ${first?.message ?? "valor no permitido"}`,
      ),
      { status: 400 },
    );
  }
  console.error("[reports] internal error:", error);
  return Response.json(
    errorBody("INTERNAL_ERROR", "Error interno al generar el reporte."),
    { status: 500 },
  );
}

export async function handleReportRoute(
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    return errorResponse(error);
  }
}

export function notImplementedSchema(): ApiError {
  return new ApiError(
    "NOT_IMPLEMENTED_SCHEMA",
    "Este reporte requiere una migración de esquema que aún no ha sido aplicada.",
  );
}
