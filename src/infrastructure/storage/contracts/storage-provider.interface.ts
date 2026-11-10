import { MultipartUploadSession } from './multipart-upload-session.interface';

export interface StorageProvider {
  createMultipartUpload(
    objectKey: string,
    totalParts: number,
  ): Promise<MultipartUploadSession>;

  completeMultipartUpload(
    uploadId: string,
    objectKey: string,
    parts: {
      etag: string;
      partNumber: number;
    }[],
  ): Promise<void>;

  abortMultipartUpload(
    uploadId: string,
    objectKey: string,
  ): Promise<void>;

  objectExists(
    objectKey: string,
  ): Promise<boolean>;

  getObjectText(
    objectKey: string,
  ): Promise<string>;

  getObjectMetadata(
    objectKey: string,
  ): Promise<{
    size: number;
    etag: string;
    contentType?: string;
  } | null>;

  downloadObject(
    objectKey: string,
    destinationPath: string,
  ): Promise<void>;

  uploadFile(
    objectKey: string,
    sourcePath: string,
    contentType: string,
  ): Promise<void>;
}