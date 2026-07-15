import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  getDurationMs,
  getRequestPath,
  getSafePrincipal,
  RequestContext,
} from './request-context.types';

@Catch()
export class SafeHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SafeHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestContext>();
    const response = http.getResponse<Response>();
    const knownException = exception instanceof HttpException;
    const statusCode = knownException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const timestamp = new Date().toISOString();
    const path = getRequestPath(request);

    this.logger.error(
      JSON.stringify({
        event: 'http_error',
        requestId: request.requestId,
        method: request.method,
        path,
        statusCode,
        ...(getDurationMs(request.requestStartedAt) === undefined
          ? {}
          : { durationMs: getDurationMs(request.requestStartedAt) }),
        ...getSafePrincipal(request),
        errorType: knownException ? 'HttpException' : 'InternalServerError',
        timestamp,
      }),
    );

    if (
      process.env.NODE_ENV !== 'production' &&
      exception instanceof Error &&
      exception.stack
    ) {
      this.logger.debug(exception.stack);
    }

    const baseResponse = knownException
      ? this.toKnownResponse(exception, statusCode)
      : {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Une erreur interne est survenue.',
        };

    response.status(statusCode).json({
      ...baseResponse,
      requestId: request.requestId,
      timestamp,
      path,
    });
  }

  private toKnownResponse(
    exception: HttpException,
    statusCode: number,
  ): Record<string, unknown> {
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return { statusCode, message: exceptionResponse };
    }

    return { ...exceptionResponse, statusCode };
  }
}
