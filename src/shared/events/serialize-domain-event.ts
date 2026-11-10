import type { Prisma } from '@prisma/client';

import { DomainEvent } from './domain-event.interface';

export function serializeDomainEvent(
  event: DomainEvent,
  correlationId?: string,
): Prisma.InputJsonObject {
  const payload = JSON.parse(
    JSON.stringify(
      event,
      (_key, value: unknown) => {
        if (typeof value !== 'bigint') {
          return value;
        }

        const maxSafeInteger =
          BigInt(Number.MAX_SAFE_INTEGER);

        return value <= maxSafeInteger
          ? Number(value)
          : value.toString();
      },
    ),
  ) as Record<string, unknown>;

  if (correlationId) {
    payload.correlationId = correlationId;
  }

  return payload as Prisma.InputJsonObject;
}