import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { RequestContextService } from './request-context.service';

interface MiddlewareRequest {
  headers: Record<string, string | string[] | undefined>;
}

interface MiddlewareResponse {
  setHeader(name: string, value: string): unknown;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(
    request: MiddlewareRequest,
    response: MiddlewareResponse,
    next: (error?: Error) => void,
  ): void {
    const header = request.headers['x-request-id'];
    const providedId = Array.isArray(header) ? header[0] : header;
    const requestId = providedId &&
      /^[A-Za-z0-9._-]{1,128}$/.test(providedId)
      ? providedId
      : randomUUID();

    response.setHeader('x-request-id', requestId);
    this.requestContext.run({ requestId }, next);
  }
}
