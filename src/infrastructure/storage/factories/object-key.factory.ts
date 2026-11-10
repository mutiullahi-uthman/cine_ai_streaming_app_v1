import { Injectable } from '@nestjs/common';

@Injectable()
export class DefaultObjectKeyFactory {
  createOriginalVideoKey(
    filmId: string,
    fileExtension: string,
  ): string {
    return [
      'films',
      filmId,
      'original',
      `source.${fileExtension}`,
    ].join('/');
  }

  createPosterKey(
    filmId: string,
  ): string {
    return [
      'films',
      filmId,
      'thumbnails',
      'poster.jpg',
    ].join('/');
  }

  createPreviewThumbnailKey(
    filmId: string,
  ): string {
    return [
      'films',
      filmId,
      'thumbnails',
      'preview.jpg',
    ].join('/');
  }

  createPreviewVideoKey(
    filmId: string,
  ): string {
    return [
      'films',
      filmId,
      'previews',
      'teaser.mp4',
    ].join('/');
  }

  createMasterPlaylistKey(
    filmId: string,
  ): string {
    return [
      'films',
      filmId,
      'hls',
      'master.m3u8',
    ].join('/');
  }

  createVariantPlaylistKey(
    filmId: string,
    rendition: string,
  ): string {
    return [
      'films',
      filmId,
      'hls',
      rendition,
      'index.m3u8',
    ].join('/');
  }

  createSegmentKey(
    filmId: string,
    rendition: string,
    segmentFileName: string,
  ): string {
    return [
      'films',
      filmId,
      'hls',
      rendition,
      segmentFileName,
    ].join('/');
  }
}