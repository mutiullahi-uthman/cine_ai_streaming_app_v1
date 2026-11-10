import { Injectable } from '@nestjs/common';

import { DomainEvent } from '../../shared/events';

import { EVENT_REGISTRY } from './constants/event-registry';
import { OutboxEventRecord } from './outbox.repository';

@Injectable()
export class EventDeserializerService {
  deserialize(
    record: OutboxEventRecord,
  ): DomainEvent {
    const factory = EVENT_REGISTRY[record.eventName];

    if (!factory) {
      throw new Error(
        `No event registered for ${record.eventName}`,
      );
    }

    if (
      record.payload === null ||
      typeof record.payload !== 'object' ||
      Array.isArray(record.payload)
    ) {
      throw new Error(
        `Invalid payload for ${record.eventName}`,
      );
    }

    const event = factory(
      record,
      record.payload as Record<string, unknown>,
    );

    return Object.assign(event, {
      eventId: record.eventId,
      occurredAt: record.occurredAt,
      correlationId: record.correlationId ?? undefined,
    });
  }
}