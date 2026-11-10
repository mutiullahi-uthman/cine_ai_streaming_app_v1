export class InvalidUploadStateException extends Error {
  constructor(
    uploadId: string,
    currentState: string,
    targetState: string,
  ) {
    super(
      `Upload ${uploadId} cannot transition from ${currentState} to ${targetState}.`,
    );

    this.name =
      InvalidUploadStateException.name;
  }
}