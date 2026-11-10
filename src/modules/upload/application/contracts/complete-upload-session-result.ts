export interface CompleteUploadSessionResult {
  uploadSessionId: string;

  filmId: string;

  objectKey: string;

  size: number;

  etag: string;
}