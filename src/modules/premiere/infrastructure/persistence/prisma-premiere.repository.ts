import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PremiereStatus as PrismaPremiereStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { RequestContextService } from '../../../../infrastructure/observability/request-context.service';
import { serializeDomainEvent } from '../../../../shared/events';
import { ConcurrentPremiereUpdateException } from '../../domain/exceptions/concurrent-premiere-update.exception';
import { Premiere } from '../../domain/entities/premiere.entity';
import { PremiereRepository } from '../../domain/repositories/premiere.repository';
import { PremiereMapper } from './premiere.mapper';

@Injectable()
export class PrismaPremiereRepository extends PremiereRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {
    super();
  }

  async save(premiere: Premiere): Promise<void> {
    const data = PremiereMapper.toPersistence(premiere);
    const events = premiere.getDomainEvents();
    const expectedVersion = premiere.getExpectedVersion();

    await this.prisma.$transaction(async (tx) => {
      if (expectedVersion === 0) {
        await tx.premiere.create({ data });
      } else {
        const result = await tx.premiere.updateMany({
          where: { id: premiere.id, version: expectedVersion },
          data,
        });
        if (result.count !== 1) {
          throw new ConcurrentPremiereUpdateException(premiere.id);
        }
      }

      if (events.length > 0) {
        await tx.outboxEvent.createMany({
          data: events.map((event) => ({
            id: randomUUID(),
            eventId: event.eventId,
            eventName: event.eventName,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            aggregateVersion: event.aggregateVersion,
            correlationId: this.requestContext.getCorrelationId() ?? null,
            payload: serializeDomainEvent(
              event,
              this.requestContext.getCorrelationId(),
            ),
            occurredAt: event.occurredAt,
            processedAt: null,
            createdAt: new Date(),
          })),
        });
      }
    });

    premiere.pullDomainEvents();
    premiere.markPersisted();
  }

  async findById(id: string): Promise<Premiere | null> {
    const record = await this.prisma.premiere.findUnique({ where: { id } });
    return record ? PremiereMapper.toDomain(record) : null;
  }

  async findByFilmId(filmId: string): Promise<Premiere | null> {
    const record = await this.prisma.premiere.findUnique({
      where: { filmId },
    });
    return record ? PremiereMapper.toDomain(record) : null;
  }

  async findScheduledStartingBefore(
    startsBefore: Date,
    limit: number,
  ): Promise<Premiere[]> {
    const records = await this.prisma.premiere.findMany({
      where: {
        status: PrismaPremiereStatus.SCHEDULED,
        startsAt: { lte: startsBefore },
      },
      orderBy: { startsAt: 'asc' },
      take: limit,
    });
    return records.map(PremiereMapper.toDomain);
  }
}
