export interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string | null;
  bitRate: number | null;
}

export interface VideoProcessingGateway {
  extractMetadata(sourceKey: string): Promise<VideoMetadata>;
  generateThumbnail(sourceKey: string, outputKey: string): Promise<void>;
  generatePreview(sourceKey: string, outputKey: string): Promise<void>;
  generateHlsRenditions(sourceKey: string, outputPrefix: string): Promise<void>;
  releaseSource(sourceKey: string): Promise<void>;
}