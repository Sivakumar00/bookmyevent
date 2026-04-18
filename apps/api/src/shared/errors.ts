export enum ErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.NOT_FOUND, message, 404, details);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.BAD_REQUEST, message, 400, details);
    this.name = 'BadRequestError';
  }
}
