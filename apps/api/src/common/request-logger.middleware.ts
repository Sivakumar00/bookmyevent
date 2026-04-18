import { Injectable, NestMiddleware } from '@nestjs/common';
import { Logger } from '@nestjs/common/services/logger.service';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      activityId: string;
    }
  }
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    req.activityId = (req.headers['x-activity-id'] as string) || randomUUID();
    const startTime = Date.now();

    this.logger.log(`[${req.activityId}] START ${req.method} ${req.path}`);

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.logger.log(
        `[${req.activityId}] END ${req.method} ${req.path} ${res.statusCode} ${duration}ms`,
      );
    });

    next();
  }
}
