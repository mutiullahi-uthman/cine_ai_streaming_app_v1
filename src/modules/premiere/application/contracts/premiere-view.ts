import { PremiereStatus } from '../../domain/enums/premiere-status.enum';
import { Premiere } from '../../domain/entities/premiere.entity';

export interface PremiereView {
  id: string;
  filmId: string;
  startsAt: Date;
  status: PremiereStatus;
  createdAt: Date;
  updatedAt: Date;
}

export function toPremiereView(premiere: Premiere): PremiereView {
  return {
    id: premiere.id,
    filmId: premiere.filmId,
    startsAt: premiere.startsAt,
    status: premiere.status,
    createdAt: premiere.createdAt,
    updatedAt: premiere.updatedAt,
  };
}
