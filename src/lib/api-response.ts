import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Consistent JSON envelope for every route handler (spec §53). */
export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; message: string; code: string; issues?: unknown };

export function apiSuccess<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, typeof init === "number" ? { status: init } : init);
}

export function apiError(message: string, code: string, status = 400, issues?: unknown) {
  return NextResponse.json<ApiError>({ success: false, message, code, issues }, { status });
}

export class AppError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Wrap a route handler body so thrown errors always produce the standard envelope. */
export function withApiErrorHandling<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        return apiError(error.message, error.code, error.status);
      }
      if (error instanceof ZodError) {
        return apiError("Validation failed", "VALIDATION_ERROR", 422, error.issues);
      }
      console.error(error);
      return apiError("Something went wrong", "INTERNAL_ERROR", 500);
    }
  };
}
