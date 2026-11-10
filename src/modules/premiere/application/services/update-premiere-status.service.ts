import {
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { InvalidPremiereStateException } from '../../domain/exceptions/invalid-premiere-state.exception';
import { PremiereNotFoundException } from '../../domain/exceptions/premiere-not-found.exception';
import { PremiereRepository } from '../../domain/repositories/premiere.repository';

@Injectable()
export class UpdatePremiereStatusService {
  constructor(private readonly premiereRepository: PremiereRepository) {}

  async cancel(id: string): Promise<void> {
    const premiere = await this.premiereRepository.findById(id);
    if (!premiere) {
      throw new PremiereNotFoundException(id);
    }
    try {
      premiere.cancel();
    } catch (error) {
      if (error instanceof InvalidPremiereStateException) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
    await this.premiereRepository.save(premiere);
  }

  async end(id: string): Promise<void> {
    const premiere = await this.premiereRepository.findById(id);
    if (!premiere) {
      throw new PremiereNotFoundException(id);
    }
    try {
      premiere.end();
    } catch (error) {
      if (error instanceof InvalidPremiereStateException) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
    await this.premiereRepository.save(premiere);
  }
}
