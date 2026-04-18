import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError, ErrorCode } from '../shared/errors';

interface ErrorResponse {
  success: boolean;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

@Catch()
export class AppErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const activityId = (request as typeof request & { activityId?: string })
      .activityId;

    let errorResponse: ErrorResponse;

    if (exception instanceof AppError) {
      this.logger.error(
        `[${activityId}] ${exception.code}: ${exception.message}`,
        exception.stack,
      );
      errorResponse = {
        success: false,
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
      };
      response.status(exception.statusCode).json(errorResponse);
    } else if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string' ? res : (res as { message: string }).message;
      const code = this.getErrorCode(status);

      this.logger.error(`[${activityId}] ${code}: ${message}`, exception.stack);

      errorResponse = {
        success: false,
        error: {
          code,
          message,
        },
      };
      response.status(status).json(errorResponse);
    } else {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Internal server error';
      this.logger.error(
        `[${activityId}] ${ErrorCode.INTERNAL_SERVER_ERROR}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );

      errorResponse = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message,
        },
      };
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }

  private getErrorCode(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }
}
