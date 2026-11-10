export class UploadNotFoundException extends Error {
  constructor(uploadId: string) {
    super(
      `Upload session ${uploadId} was not found.`,
    );

    this.name =
      UploadNotFoundException.name;
  }
}