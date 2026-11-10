import { Injectable } from '@nestjs/common';

import { UploadSessionRepository } from '../../domain/repositories/upload-session.repository';
import {
  toUploadSessionView,
  UploadSessionView,
} from '../contracts/upload-session-view';

@Injectable()
export class ListFilmUploadsService {
  constructor(
    private readonly uploadRepository: UploadSessionRepository,
  ) {}

  async execute(
    filmId: string,
  ): Promise<UploadSessionView[]> {
    const uploads = await this.uploadRepository.findByFilmId(filmId);

    return uploads.map(toUploadSessionView);
  }
}