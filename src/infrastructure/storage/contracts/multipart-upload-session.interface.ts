import { MultipartUploadPart } from './multipart-upload-part.interface.js';

export interface MultipartUploadSession {
  uploadId: string;

  objectKey: string;

  expiresIn: number;

  parts: MultipartUploadPart[];
}