import {
  Premiere as PrismaPremiere,
  PremiereStatus as PrismaPremiereStatus,
} from '@prisma/client';

import { Premiere } from '../../domain/entities/premiere.entity';
import { PremiereStatus } from '../../domain/enums/premiere-status.enum';

export class PremiereMapper {
  static toPersistence(premiere: Premiere): PrismaPremiere {
    return {
      id: premiere.id,
      filmId: premiere.filmId,
      startsAt: premiere.startsAt,
      status: premiere.status as PrismaPremiereStatus,
      version: premiere.getVersion(),
      createdAt: premiere.createdAt,
      updatedAt: premiere.updatedAt,
    };
  }

  static toDomain(raw: PrismaPremiere): Premiere {
    return Premiere.rehydrate({
      id: raw.id,
      filmId: raw.filmId,
      startsAt: raw.startsAt,
      status: raw.status as PremiereStatus,
      version: raw.version,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
