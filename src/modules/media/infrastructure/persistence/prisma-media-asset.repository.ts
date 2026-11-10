import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { serializeDomainEvent } from '../../../../shared/events';
import { RequestContextService } from '../../../../infrastructure/observability/request-context.service';
import { ConcurrentMediaAssetUpdateException } from '../../domain/exceptions/concurrent-media-asset-update.exception';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import { MediaAssetRepository } from '../../domain/repositories/media-asset.repository';
import { MediaAssetMapper } from './media-asset.mapper';

@Injectable()
export class PrismaMediaAssetRepository extends MediaAssetRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {
    super();
  }

  async save(asset: MediaAsset): Promise<void> {
    const data = MediaAssetMapper.toPersistence(asset);
    const events = asset.getDomainEvents();
    const expectedVersion = asset.getExpectedVersion();

    await this.prisma.$transaction(async (tx) => {
      if (expectedVersion === 0) {
        await tx.mediaAsset.create({ data });
      } else {
        const result = await tx.mediaAsset.updateMany({
          where: { id: asset.id, version: expectedVersion },
          data,
        });
        if (result.count !== 1) {
          throw new ConcurrentMediaAssetUpdateException(asset.id);
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

  async findById(id: string): Promise<MediaAsset | null> {
    const record = await this.prisma.mediaAsset.findUnique({
      where: { id },
    });
    return record ? MediaAssetMapper.toDomain(record) : null;
  }

  async findByObjectKey(objectKey: string): Promise<MediaAsset | null> {
    const record = await this.prisma.mediaAsset.findUnique({
      where: { objectKey },
    });
    return record ? MediaAssetMapper.toDomain(record) : null;
  }

  async findLatestByFilmId(filmId: string): Promise<MediaAsset | null> {
    const record = await this.prisma.mediaAsset.findFirst({
      where: { filmId },
      orderBy: { createdAt: 'desc' },
    });
    return record ? MediaAssetMapper.toDomain(record) : null;
  }
}