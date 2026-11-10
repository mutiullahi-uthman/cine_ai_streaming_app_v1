export class UnsupportedFileExtensionException extends Error {
  constructor(extension: string) {
    super(
      `Unsupported file extension: ${extension}`,
    );

    this.name =
      UnsupportedFileExtensionException.name;
  }
}