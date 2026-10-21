import { NextResponse } from "next/server";
import { isAppError, ValidationError } from "./errors";

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

interface PlainError {
  message: string;
  status: number;
  code?: string;
}

function isPlainError(err: unknown): err is PlainError {
  return (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as any).message === "string" &&
    "status" in err &&
    typeof (err as any).status === "number"
  );
}

function isPrismaError(err: unknown): err is { code: string; meta?: any } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as any).code === "string" &&
    (err as any).code.startsWith("P")
  );
}

export function errorResponse(err: unknown) {
  if (err instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: { code: err.code, message: err.message, issues: err.issues },
      },
      { status: err.statusCode }
    );
  }

  if (isAppError(err)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: err.code, message: err.message },
      },
      { status: err.statusCode }
    );
  }

  if (isPlainError(err)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: err.code ?? "ERROR", message: err.message },
      },
      { status: err.status }
    );
  }

  if (isPrismaError(err)) {
    console.error("Prisma error:", err.code, err.meta);

    if (err.code === "P2002") {
      const fields = Array.isArray(err.meta?.target)
        ? err.meta.target.join(", ")
        : "value";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE",
            message: `A record with this ${fields} already exists.`,
          },
        },
        { status: 409 }
      );
    }

    if (err.code === "P2003") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FOREIGN_KEY",
            message: "This record is linked to other data and cannot be changed.",
          },
        },
        { status: 400 }
      );
    }

    if (err.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Record not found.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DB_ERROR",
          message: `Database error (${err.code}).`,
        },
      },
      { status: 500 }
    );
  }

  console.error("Unhandled API error:", err);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 }
  );
}