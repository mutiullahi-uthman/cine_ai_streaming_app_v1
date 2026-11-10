import { randomUUID } from 'crypto';

import { DomainEvent } from './domain-event.interface';

export abstract class BaseDomainEvent
  implements DomainEvent
{
  public readonly eventId: string;

  public readonly occurredAt: Date;

  abstract readonly eventName: string;

  constructor(
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    public readonly aggregateVersion: number,
  ) {
    this.eventId = randomUUID();

    this.occurredAt = new Date();
  }
}