import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestLogContext {
  requestId: string;
}

@Injectable()
export class RequestContextService {
  private readonly storage =
    new AsyncLocalStorage<RequestLogContext>();

  run<T>(context: RequestLogContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getRequestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }

  getCorrelationId(): string | undefined {
    return this.getRequestId();
  }
}
