import { Injectable } from '@nestjs/common';

import { PremiereNotFoundException } from '../../domain/exceptions/premiere-not-found.exception';
import { PremiereRepository } from '../../domain/repositories/premiere.repository';
import { PremiereView, toPremiereView } from '../contracts/premiere-view';

@Injectable()
export class GetPremiereService {
  constructor(private readonly premiereRepository: PremiereRepository) {}

  async executeById(id: string): Promise<PremiereView> {
    const premiere = await this.premiereRepository.findById(id);
    if (!premiere) {
      throw new PremiereNotFoundException(id);
    }
    return toPremiereView(premiere);
  }

  async executeByFilmId(filmId: string): Promise<PremiereView> {
    const premiere = await this.premiereRepository.findByFilmId(filmId);
    if (!premiere) {
      throw new PremiereNotFoundException(`film ${filmId}`);
    }
    return toPremiereView(premiere);
  }
}
