import { Injectable } from '@nestjs/common';

import { UploadNotFoundException } from '../../domain/exceptions/upload-not-found.exception';
import { UploadSessionRepository } from '../../domain/repositories/upload-session.repository';
import {
  toUploadSessionView,
  UploadSessionView,
} from '../contracts/upload-session-view';

@Injectable()
export class GetUploadSessionService {
  constructor(
    private readonly uploadRepository: UploadSessionRepository,
  ) {}

  async execute(
    uploadId: string,
  ): Promise<UploadSessionView> {
    const upload = await this.uploadRepository.findById(uploadId);

    if (!upload) {
      throw new UploadNotFoundException(uploadId);
    }

    return toUploadSessionView(upload);
  }
}