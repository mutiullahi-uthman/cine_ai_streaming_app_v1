export interface CreateUploadSessionResult {
  uploadSessionId: string;

  uploadId: string;

  objectKey: string;

  expiresIn: number;

  parts: {
    partNumber: number;
    uploadUrl: string;
  }[];
}