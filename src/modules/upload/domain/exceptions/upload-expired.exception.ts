export class UploadExpiredException extends Error {
  constructor(
    uploadId: string,
  ) {
    super(
      `Upload session ${uploadId} has expired.`,
    );

    this.name =
      UploadExpiredException.name;
  }
}