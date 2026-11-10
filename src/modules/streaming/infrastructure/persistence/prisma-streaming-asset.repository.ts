import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StreamingAssetStatus as PrismaStreamingAssetStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { serializeDomainEvent } from '../../../../shared/events';
import { RequestContextService } from '../../../../infrastructure/observability/request-context.service';
import { ConcurrentStreamingAssetUpdateException } from '../../domain/exceptions/concurrent-streaming-asset-update.exception';
import { StreamingAsset } from '../../domain/entities/streaming-asset.entity';
import { StreamingAssetStatus } from '../../domain/enums/streaming-asset-status.enum';
import { StreamingAssetRepository } from '../../domain/repositories/streaming-asset.repository';
import { StreamingAssetMapper } from './streaming-asset.mapper';

@Injectable()
export class PrismaStreamingAssetRepository
  extends StreamingAssetRepository
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {
    super();
  }

  async save(asset: StreamingAsset): Promise<void> {
    const data = StreamingAssetMapper.toPersistence(asset);
    const events = asset.getDomainEvents();
    const expectedVersion = asset.getExpectedVersion();

    await this.prisma.$transaction(async (tx) => {
      if (expectedVersion === 0) {
        await tx.streamingAsset.create({ data });
      } else {
        const result = await tx.streamingAsset.updateMany({
          where: { id: asset.id, version: expectedVersion },
          data,
        });
        if (result.count !== 1) {
          throw new ConcurrentStreamingAssetUpdateException(asset.id);
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

    asset.pullDomainEvents();
    asset.markPersisted();
  }

  async findByMediaAssetId(
    mediaAssetId: string,
  ): Promise<StreamingAsset | null> {
    const record = await this.prisma.streamingAsset.findUnique({
      where: { mediaAssetId },
    });
    return record ? StreamingAssetMapper.toDomain(record) : null;
  }

  async findReadyByFilmId(
    filmId: string,
  ): Promise<StreamingAsset | null> {
    const record = await this.prisma.streamingAsset.findFirst({
      where: {
        filmId,
        status: PrismaStreamingAssetStatus.READY,
      },
      orderBy: { createdAt: 'desc' },
    });
    return record ? StreamingAssetMapper.toDomain(record) : null;
  }
}
