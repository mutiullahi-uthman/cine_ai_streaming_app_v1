export interface ObjectKeyFactory {
  createOriginalVideoKey(
    filmId: string,
    fileExtension: string,
  ): string;

  createPosterKey(
    filmId: string,
  ): string;

  createPreviewThumbnailKey(
    filmId: string,
  ): string;

  createPreviewVideoKey(
    filmId: string,
  ): string;

  createMasterPlaylistKey(
    filmId: string,
  ): string;

  createVariantPlaylistKey(
    filmId: string,
    rendition: string,
  ): string;

  createSegmentKey(
    filmId: string,
    rendition: string,
    segmentFileName: string,
  ): string;
}