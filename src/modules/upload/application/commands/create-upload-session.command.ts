export class CreateUploadSessionCommand {
  constructor(
    public readonly filmId: string,

    public readonly originalFilename: string,

    public readonly fileSize: bigint,

    public readonly totalParts: number,
  ) {}
}