export interface OutboxEventRecord {
  eventId: string;
  eventName: string;
  aggregateId: string;
  aggregateType: string;
  aggregateVersion: number;
  correlationId: string | null;
  payload: unknown;
  occurredAt: Date;
}

export interface OutboxHealth {
  pendingCount: number;
  oldestPendingAt: Date | null;
}

export abstract class OutboxRepository {
  abstract getUnprocessed(
    limit: number,
  ): Promise<OutboxEventRecord[]>;

  abstract markProcessed(
    eventId: string,
  ): Promise<void>;

  abstract getHealth(): Promise<OutboxHealth>;
}