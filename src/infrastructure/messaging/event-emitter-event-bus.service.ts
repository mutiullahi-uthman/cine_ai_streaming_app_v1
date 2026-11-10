import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MetricsService } from '../observability/metrics.service';
import { RequestContextService } from '../observability/request-context.service';
import {
  DomainEvent,
  EventBus,
} from '../../shared/events';

@Injectable()
export class EventEmitterEventBus
  implements EventBus
{
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly metrics: MetricsService,
    private readonly requestContext: RequestContextService,
  ) {}

  async publish(
    event: DomainEvent,
  ): Promise<void> {
    await this.requestContext.run(
      { requestId: event.correlationId ?? event.eventId },
      () => this.eventEmitter.emitAsync(event.eventName, event),
    );
    this.metrics.incrementEvent(event.eventName);
  }

  async publishAll(
    events: DomainEvent[],
  ): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}