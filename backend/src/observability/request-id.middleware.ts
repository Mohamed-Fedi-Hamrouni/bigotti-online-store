import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Response } from 'express';
import type { RequestContext } from './request-context.types';

export const REQUEST_ID_HEADER = 'X-Request-ID';
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestContext, response: Response, next: NextFunction): void {
    const incoming = request.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming)
        ? incoming
        : randomUUID();

    request.requestId = requestId;
    request.requestStartedAt = process.hrtime.bigint();
    response.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
