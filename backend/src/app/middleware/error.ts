import crypto from 'node:crypto';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly fieldErrors?: Record<string, string>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(422, 'VALIDATION_ERROR', message, fieldErrors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Autentikasi diperlukan untuk mengakses sumber daya ini') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Anda tidak memiliki hak akses untuk tindakan ini') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Data atau sumber daya tidak ditemukan') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(409, 'CONFLICT', message, fieldErrors);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Terlalu banyak permintaan. Silakan tunggu beberapa saat.') {
    super(429, 'RATE_LIMITED', message);
  }
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
    requestId: string;
  };
}

export function formatErrorResponse(
  error: unknown,
  requestId = crypto.randomUUID()
): { status: number; body: ApiErrorResponse } {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          fieldErrors: error.fieldErrors,
          requestId,
        },
      },
    };
  }

  // Tangani error Elysia bawaan (seperti validasi skema)
  const errObj = error as { status?: number; code?: string; message?: string };
  if (errObj && typeof errObj === 'object') {
    if (errObj.code === 'VALIDATION') {
      return {
        status: 422,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Data masukan tidak valid',
            requestId,
          },
        },
      };
    }
    if (errObj.code === 'NOT_FOUND') {
      return {
        status: 404,
        body: {
          error: {
            code: 'NOT_FOUND',
            message: 'Endpoint tidak ditemukan',
            requestId,
          },
        },
      };
    }
  }

  // Tangani error Prisma konflik duplikat (P2002) & deadlock konkurensi (P2034 / 1213)
  const anyErr = error as any;
  if (anyErr?.code === 'P2002' || anyErr?.cause?.code === 'ER_DUP_ENTRY') {
    return {
      status: 409,
      body: {
        error: {
          code: 'CONFLICT',
          message: 'Data sudah ada atau terjadi konflik entitas.',
          requestId,
        },
      },
    };
  }
  if (
    anyErr?.code === 'P2034' ||
    anyErr?.cause?.originalCode === '1213' ||
    anyErr?.message?.includes('Deadlock')
  ) {
    return {
      status: 409,
      body: {
        error: {
          code: 'CONFLICT',
          message: 'Terjadi konflik konkurensi pada data. Silakan coba kembali.',
          requestId,
        },
      },
    };
  }

  // Error tak terduga: sembunyikan detail teknis/stack trace
  console.error(`[UNHANDLED_ERROR] [${requestId}]:`, error);
  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada server. Silakan coba kembali nanti.',
        requestId,
      },
    },
  };
}
