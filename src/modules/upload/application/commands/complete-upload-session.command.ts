export class CompleteUploadSessionCommand {
  constructor(
    public readonly uploadSessionId: string,

    public readonly completedParts: {
      partNumber: number;
      etag: string;
    }[],
  ) {}
}