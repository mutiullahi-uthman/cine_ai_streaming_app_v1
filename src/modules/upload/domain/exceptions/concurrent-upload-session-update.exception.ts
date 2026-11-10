import { ConflictException } from '@nestjs/common';

export class ConcurrentUploadSessionUpdateException
  extends ConflictException
{
  constructor(uploadSessionId: string) {
    super(
      `Upload session ${uploadSessionId} was modified by another operation.`,
    );
  }
}