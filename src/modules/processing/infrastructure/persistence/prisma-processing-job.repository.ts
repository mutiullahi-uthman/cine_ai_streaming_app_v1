import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ProcessingStatus as PrismaProcessingStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { serializeDomainEvent } from '../../../../shared/events';
import { RequestContextService } from '../../../../infrastructure/observability/request-context.service';
import { ConcurrentProcessingJobUpdateException } from '../../domain/exceptions/concurrent-processing-job-update.exception';
import { ProcessingJob } from '../../domain/entities/processing-job.entity';
import { ProcessingJobRepository } from '../../domain/repositories/processing-job.repository';
import { ProcessingJobMapper } from './processing-job.mapper';

@Injectable()
export class PrismaProcessingJobRepository extends ProcessingJobRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {
    super();
  }

  async save(job: ProcessingJob): Promise<void> {
    const data = ProcessingJobMapper.toPersistence(job);
    const events = job.getDomainEvents();
    const expectedVersion = job.getExpectedVersion();

    await this.prisma.$transaction(async (tx) => {
      if (expectedVersion === 0) {
        await tx.processingJob.create({ data });
      } else {
        const result = await tx.processingJob.updateMany({
          where: { id: job.id, version: expectedVersion },
          data,
        });
        if (result.count !== 1) {
          throw new ConcurrentProcessingJobUpdateException(job.id);
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

    job.pullDomainEvents();
    job.markPersisted();
  }

  async findById(id: string): Promise<ProcessingJob | null> {
    const record = await this.prisma.processingJob.findUnique({
      where: { id },
    });
    return record ? ProcessingJobMapper.toDomain(record) : null;
  }

  async findByMediaAssetId(
    mediaAssetId: string,
  ): Promise<ProcessingJob | null> {
    const record = await this.prisma.processingJob.findUnique({
      where: { mediaAssetId },
    });
    return record ? ProcessingJobMapper.toDomain(record) : null;
  }

  async findPending(limit: number): Promise<ProcessingJob[]> {
    const records = await this.prisma.processingJob.findMany({
      where: {
        status: PrismaProcessingStatus.PENDING,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return records.map(ProcessingJobMapper.toDomain);
  }

  async findStaleProcessing(
    staleBefore: Date,
    limit: number,
  ): Promise<ProcessingJob[]> {
    const records = await this.prisma.processingJob.findMany({
      where: {
        status: PrismaProcessingStatus.PROCESSING,
        updatedAt: { lte: staleBefore },
      },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
    return records.map(ProcessingJobMapper.toDomain);
  }
}