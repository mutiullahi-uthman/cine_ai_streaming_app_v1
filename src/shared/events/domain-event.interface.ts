export interface DomainEvent {
  readonly eventId: string;

  readonly eventName: string;

  readonly aggregateId: string;

  readonly aggregateType: string;

  readonly aggregateVersion: number;
  readonly correlationId?: string;

  readonly occurredAt: Date;
}
