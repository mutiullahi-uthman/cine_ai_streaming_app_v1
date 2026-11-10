import { DomainEvent } from './domain-event.interface';

export interface EventBus {
  publish(
    event: DomainEvent,
  ): Promise<void>;

  publishAll(
    events: DomainEvent[],
  ): Promise<void>;
}