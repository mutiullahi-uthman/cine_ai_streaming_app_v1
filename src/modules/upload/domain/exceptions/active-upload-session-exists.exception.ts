export class ActiveUploadSessionExistsException extends Error {
  constructor(
    filmId: string,
  ) {
    super(
      `Film ${filmId} already has an active upload session.`,
    );

    this.name =
      ActiveUploadSessionExistsException.name;
  }
}