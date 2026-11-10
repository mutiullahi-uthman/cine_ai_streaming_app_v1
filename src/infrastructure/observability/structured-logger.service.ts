import { Injectable } from '@nestjs/common';

import { RequestContextService } from './request-context.service';

@Injectable()
export class StructuredLogger {
  constructor(private readonly requestContext: RequestContextService) {}

  info(message: string, fields: Record<string, unknown> = {}): void {
    this.write('info', message, fields);
  }

  warn(message: string, fields: Record<string, unknown> = {}): void {
    this.write('warn', message, fields);
  }

  error(
    message: string,
    error: unknown,
    fields: Record<string, unknown> = {},
  ): void {
    this.write('error', message, {
      ...fields,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  private write(
    level: 'info' | 'warn' | 'error',
    message: string,
    fields: Record<string, unknown>,
  ): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...fields,
      requestId: fields.requestId ?? this.requestContext.getRequestId(),
    };
    const output = JSON.stringify(entry);

    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }
}
