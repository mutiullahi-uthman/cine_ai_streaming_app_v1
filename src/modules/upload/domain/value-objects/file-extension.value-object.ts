import { UnsupportedFileExtensionException } from '../exceptions/unsupported-file-extension.exception';

export class FileExtension {
  private static readonly SUPPORTED_EXTENSIONS =
    new Set([
      'mp4',
      'mov',
      'mkv',
      'webm',
    ]);

  private constructor(
    private readonly value: string,
  ) {}

  public static create(
    extension: string,
  ): FileExtension {
    const normalized =
      extension
        .trim()
        .toLowerCase()
        .replace('.', '');

    if (!normalized) {
      throw new UnsupportedFileExtensionException(
        extension,
      );
    }

    if (
      !FileExtension.SUPPORTED_EXTENSIONS.has(
        normalized,
      )
    ) {
      throw new UnsupportedFileExtensionException(
        extension,
      );
    }

    return new FileExtension(
      normalized,
    );
  }

  public getValue(): string {
    return this.value;
  }

  public equals(
    other: FileExtension,
  ): boolean {
    return (
      this.value ===
      other.value
    );
  }

  public toString(): string {
    return this.value;
  }
}