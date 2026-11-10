import {
  Inject,
  Injectable,
} from '@nestjs/common';

import { FilmRepository } from '../../../film/domain/repositories/film.repository';

import { FilmNotFoundException } from '../../../film/domain/exceptions/film-not-found.exception';

import {
  OBJECT_KEY_FACTORY,
  STORAGE_PROVIDER,
} from '../../../../infrastructure/storage';

import type {
  StorageProvider,
} from '../../../../infrastructure/storage';

import type {
  ObjectKeyFactory,
} from '../../../../infrastructure/storage/contracts/object-key-factory.interface';

import { FileExtension } from '../../domain/value-objects/file-extension.value-object';

import { UploadSession } from '../../domain/entities/upload-session.entity';

import { UploadSessionRepository } from '../../domain/repositories/upload-session.repository';

import { ActiveUploadSessionExistsException } from '../../domain/exceptions/active-upload-session-exists.exception';

import { InvalidFileSizeException } from '../../domain/exceptions/invalid-file-size.exception';

import { CreateUploadSessionCommand } from '../commands/create-upload-session.command';

import { CreateUploadSessionResult } from '../contracts/create-upload-session-result';

@Injectable()
export class CreateUploadSessionService {
  private static readonly SESSION_TTL_HOURS =
    24;

  constructor(
    private readonly filmRepository: FilmRepository,

    private readonly uploadRepository: UploadSessionRepository,

    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,

    @Inject(OBJECT_KEY_FACTORY)
    private readonly objectKeyFactory: ObjectKeyFactory,
  ) {}

  async execute(
    command: CreateUploadSessionCommand,
  ): Promise<CreateUploadSessionResult> {
    const film =
      await this.filmRepository.findById(
        command.filmId,
      );

    if (!film) {
      throw new FilmNotFoundException(
        command.filmId,
      );
    }

    if (
      command.fileSize <= BigInt(0)
    ) {
      throw new InvalidFileSizeException(
        command.fileSize,
      );
    }

    const activeUpload =
      await this.uploadRepository.findActiveByFilmId(
        command.filmId,
      );

    if (activeUpload) {
      throw new ActiveUploadSessionExistsException(
        command.filmId,
      );
    }

    const extension =
      this.extractFileExtension(
        command.originalFilename,
      );

    const objectKey =
      this.objectKeyFactory.createOriginalVideoKey(
        command.filmId,
        extension.getValue(),
      );

    const multipartUpload =
      await this.storageProvider.createMultipartUpload(
        objectKey,
        command.totalParts,
      );

    const expiresAt =
      new Date();

    expiresAt.setHours(
      expiresAt.getHours() +
        CreateUploadSessionService.SESSION_TTL_HOURS,
    );

    const uploadSession =
      UploadSession.create({
        filmId:
          command.filmId,

        objectKey,

        storageUploadId:
          multipartUpload.uploadId,

        expectedSize:
          command.fileSize,

        expiresAt,
      });

    uploadSession.start();

    await this.uploadRepository.save(
      uploadSession,
    );

    film.markUploading();

    await this.filmRepository.save(
      film,
    );

    return {
      uploadSessionId:
        uploadSession.id,

      uploadId:
        multipartUpload.uploadId,

      objectKey:
        multipartUpload.objectKey,

      expiresIn:
        multipartUpload.expiresIn,

      parts:
        multipartUpload.parts,
    };
  }

  private extractFileExtension(
    fileName: string,
  ): FileExtension {
    const lastIndex =
      fileName.lastIndexOf('.');

    if (lastIndex === -1) {
      throw new Error(
        'File extension is required.',
      );
    }

    const extension =
      fileName.substring(
        lastIndex + 1,
      );

    return FileExtension.create(
      extension,
    );
  }
}