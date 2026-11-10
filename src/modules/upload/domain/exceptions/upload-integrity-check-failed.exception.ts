export class UploadIntegrityCheckFailedException extends Error {
  constructor(uploadId: string) {
    super(
      `Upload session ${uploadId} failed its integrity check.`,
    );

    this.name = UploadIntegrityCheckFailedException.name;
  }
}