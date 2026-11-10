import {
  Injectable,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { EventBus } from '../../shared/events';
import { EVENT_BUS } from '../../shared/contracts';

import { Inject } from '@nestjs/common';

import { EventDeserializerService } from './event-deserializer.service';
import { OutboxRepository } from './outbox.repository';
import { StructuredLogger } from '../observability/structured-logger.service';

@Injectable()
export class OutboxPublisherService {
  private isPublishing = false;

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly eventDeserializer: EventDeserializerService,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
    private readonly logger: StructuredLogger,
  ) {}

  @Cron('*/5 * * * * *')
  async publishPending(): Promise<void> {
    if (this.isPublishing) {
      return;
    }

    this.isPublishing = true;

    try {
      const records =
        await this.outboxRepository.getUnprocessed(100);

      for (const record of records) {
        try {
          const event =
            this.eventDeserializer.deserialize(record);

          await this.eventBus.publish(event);
          await this.outboxRepository.markProcessed(
            record.eventId,
          );
        } catch (error) {
          this.logger.error('Failed to publish outbox event.', error, {
            eventId: record.eventId,
            eventName: record.eventName,
            aggregateId: record.aggregateId,
            correlationId: record.correlationId,
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to load pending outbox events.', error);
    } finally {
      this.isPublishing = false;
    }
  }
}