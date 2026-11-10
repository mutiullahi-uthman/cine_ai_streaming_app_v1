import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

import {
  OutboxHealth,
  OutboxEventRecord,
  OutboxRepository,
} from './outbox.repository';

@Injectable()
export class PrismaOutboxRepository
  extends OutboxRepository
{
  constructor(
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async getUnprocessed(
    limit: number,
  ): Promise<OutboxEventRecord[]> {
    const records = await this.prisma.outboxEvent.findMany({
      where: {
        processedAt: null,
      },
      orderBy: [
        { occurredAt: 'asc' },
        { createdAt: 'asc' },
      ],
      take: limit,
    });

    return records.map((record) => ({
      eventId: record.eventId,
      eventName: record.eventName,
      aggregateId: record.aggregateId,
      aggregateType: record.aggregateType,
      aggregateVersion: record.aggregateVersion,
      correlationId: record.correlationId,
      payload: record.payload,
      occurredAt: record.occurredAt,
    }));
  }

  async markProcessed(
    eventId: string,
  ): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: {
        eventId,
      },
      data: {
        processedAt: new Date(),
      },
    });
  }

  async getHealth(): Promise<OutboxHealth> {
    const [pendingCount, oldestPending] = await Promise.all([
      this.prisma.outboxEvent.count({
        where: { processedAt: null },
      }),
      this.prisma.outboxEvent.findFirst({
        where: { processedAt: null },
        orderBy: [
          { occurredAt: 'asc' },
          { createdAt: 'asc' },
        ],
        select: { occurredAt: true },
      }),
    ]);

    return {
      pendingCount,
      oldestPendingAt: oldestPending?.occurredAt ?? null,
    };
  }
}