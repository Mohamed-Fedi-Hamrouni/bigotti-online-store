import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  getDurationMs,
  getRequestPath,
  getSafePrincipal,
  RequestContext,
} from './request-context.types';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestContext>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      tap({
        next: () => {
          const path = getRequestPath(request);
          const statusCode = response.statusCode;

          if (
            statusCode < 400 &&
            (path === '/health/live' || path === '/health/ready')
          ) {
            return;
          }

          this.logger.log(
            JSON.stringify({
              event: 'http_request',
              requestId: request.requestId,
              method: request.method,
              path,
              statusCode,
              durationMs: getDurationMs(request.requestStartedAt) ?? 0,
              ...getSafePrincipal(request),
              timestamp: new Date().toISOString(),
            }),
          );
        },
      }),
    );
  }
}
