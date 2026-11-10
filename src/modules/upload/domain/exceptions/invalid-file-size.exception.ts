export class InvalidFileSizeException extends Error {
  constructor(
    size: bigint,
  ) {
    super(
      `Invalid file size: ${size}`,
    );

    this.name =
      InvalidFileSizeException.name;
  }
}