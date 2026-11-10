export interface StoredDomainEvent {
  eventId: string;

  eventName: string;

  aggregateId: string;

  aggregateType: string;

  aggregateVersion: number;

  occurredAt: Date;

  payload: Record<string, unknown>;
}