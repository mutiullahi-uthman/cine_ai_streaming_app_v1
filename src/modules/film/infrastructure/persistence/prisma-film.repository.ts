import { Injectable } from '@nestjs/common';

import { randomUUID } from 'crypto';

import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { serializeDomainEvent } from '../../../../shared/events';
import { RequestContextService } from '../../../../infrastructure/observability/request-context.service';

import { Film } from '../../domain/entities/film.entity';
import { ConcurrentFilmUpdateException } from '../../domain/exceptions/concurrent-film-update.exception';
import { FilmRepository } from '../../domain/repositories/film.repository';

import { FilmMapper } from './film.mapper';

@Injectable()
export class PrismaFilmRepository
  extends FilmRepository
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {
    super();
  }

  async save(
    film: Film,
  ): Promise<void> {
    const filmData =
      FilmMapper.toPersistence(film);

    const events = film.getDomainEvents();
    const expectedVersion = film.getExpectedVersion();

    await this.prisma.$transaction(
      async (tx) => {
        if (expectedVersion === 0) {
          await tx.film.create({
            data: filmData,
          });
        } else {
          const result = await tx.film.updateMany({
            where: {
              id: film.id,
              version: expectedVersion,
            },
            data: filmData,
          });

          if (result.count !== 1) {
            throw new ConcurrentFilmUpdateException(
              film.id,
            );
          }
        }

        if (events.length === 0) {
          return;
        }

        await tx.outboxEvent.createMany({
          data: events.map(
            (event) => ({
              id: randomUUID(),

              eventId:
                event.eventId,

              eventName:
                event.eventName,

              aggregateId:
                event.aggregateId,

              aggregateType:
                event.aggregateType,

              aggregateVersion:
                event.aggregateVersion,

              correlationId:
                this.requestContext.getCorrelationId() ?? null,

              payload: serializeDomainEvent(
                event,
                this.requestContext.getCorrelationId(),
              ),

              occurredAt:
                event.occurredAt,

              createdAt:
                new Date(),

              processedAt:
                null,
            }),
          ),
        });
      },
    );

    film.pullDomainEvents();
    film.markPersisted();
  }

  async findById(
    id: string,
  ): Promise<Film | null> {
    const film =
      await this.prisma.film.findUnique({
        where: {
          id,
        },
      });

    if (!film) {
      return null;
    }

    return FilmMapper.toDomain(
      film,
    );
  }

  async findAll(): Promise<Film[]> {
    const films = await this.prisma.film.findMany({
      where: {
        status: {
          in: ['READY', 'PUBLISHED'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return films.map(FilmMapper.toDomain);
  }
}