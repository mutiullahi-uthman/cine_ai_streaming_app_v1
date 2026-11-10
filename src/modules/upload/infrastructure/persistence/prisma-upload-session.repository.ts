import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UploadStatus as PrismaUploadStatus } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { serializeDomainEvent } from '../../../../shared/events';
import { RequestContextService } from '../../../../infrastructure/observability/request-context.service';

import { ConcurrentUploadSessionUpdateException } from '../../domain/exceptions/concurrent-upload-session-update.exception';
import { UploadSession } from '../../domain/entities/upload-session.entity';
import { UploadSessionRepository } from '../../domain/repositories/upload-session.repository';

import { UploadSessionMapper } from './upload-session.mapper';

@Injectable()
export class PrismaUploadSessionRepository
  extends UploadSessionRepository
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {
    super();
  }

  async save(
    upload: UploadSession,
  ): Promise<void> {
    const uploadData = UploadSessionMapper.toPersistence(upload);
    const events = upload.getDomainEvents();
    const expectedVersion = upload.getExpectedVersion();

    await this.prisma.$transaction(async (tx) => {
      if (expectedVersion === 0) {
        await tx.uploadSession.create({
          data: uploadData,
        });
      } else {
        const result = await tx.uploadSession.updateMany({
          where: {
            id: upload.id,
            version: expectedVersion,
          },
          data: uploadData,
        });

        if (result.count !== 1) {
          throw new ConcurrentUploadSessionUpdateException(
            upload.id,
          );
        }
      }

      if (events.length === 0) {
        return;
      }

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
    });

    upload.pullDomainEvents();
    upload.markPersisted();
  }

  async findById(
    id: string,
  ): Promise<UploadSession | null> {
    const record = await this.prisma.uploadSession.findUnique({
      where: { id },
    });

    return record
      ? UploadSessionMapper.toDomain(record)
      : null;
  }

  async findActiveByFilmId(
    filmId: string,
  ): Promise<UploadSession | null> {
    const record = await this.prisma.uploadSession.findFirst({
      where: {
        filmId,
        status: {
          in: [
            PrismaUploadStatus.CREATED,
            PrismaUploadStatus.UPLOADING,
          ],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return record
      ? UploadSessionMapper.toDomain(record)
      : null;
  }

  async findByFilmId(
    filmId: string,
  ): Promise<UploadSession[]> {
    const records = await this.prisma.uploadSession.findMany({
      where: { filmId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return records.map(UploadSessionMapper.toDomain);
  }

  async findExpired(
    now: Date,
    limit: number,
  ): Promise<UploadSession[]> {
    const records = await this.prisma.uploadSession.findMany({
      where: {
        status: {
          in: [
            PrismaUploadStatus.CREATED,
            PrismaUploadStatus.UPLOADING,
          ],
        },
        expiresAt: {
          lte: now,
        },
      },
      orderBy: {
        expiresAt: 'asc',
      },
      take: limit,
    });

    return records.map(UploadSessionMapper.toDomain);
  }
}