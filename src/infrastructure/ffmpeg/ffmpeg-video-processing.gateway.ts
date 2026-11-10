import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';

import { STORAGE_PROVIDER } from '../storage';
import type { StorageProvider } from '../storage';
import { Inject } from '@nestjs/common';
import {
  VideoMetadata,
  VideoProcessingGateway,
} from './contracts/video-processing.gateway';

interface ProbeResult {
  format?: {
    duration?: string;
    bit_rate?: string;
  };
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
    width?: number;
    height?: number;
  }>;
}

@Injectable()
export class FfmpegVideoProcessingGateway
  implements VideoProcessingGateway
{
  private readonly sourceCache = new Map<
    string,
    Promise<{ directory: string; sourcePath: string }>
  >();

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
  ) {}

  async extractMetadata(sourceKey: string): Promise<VideoMetadata> {
    return this.withSource(sourceKey, async (sourcePath) => {
      const output = await this.run(
        process.env.FFPROBE_PATH ?? 'ffprobe',
        [
          '-v', 'error',
          '-show_entries',
          'format=duration,bit_rate:stream=codec_type,codec_name,width,height',
          '-of', 'json',
          sourcePath,
        ],
      );
      const probe = JSON.parse(output) as ProbeResult;
      const video = probe.streams?.find(
        (stream) => stream.codec_type === 'video',
      );
      const audio = probe.streams?.find(
        (stream) => stream.codec_type === 'audio',
      );
      const durationSeconds = Number(probe.format?.duration);

      if (
        !video?.codec_name ||
        !video.width ||
        !video.height ||
        !Number.isFinite(durationSeconds) ||
        durationSeconds <= 0
      ) {
        throw new Error('The uploaded file has invalid video metadata.');
      }

      const bitRate = Number(probe.format?.bit_rate);
      return {
        durationSeconds,
        width: video.width,
        height: video.height,
        videoCodec: video.codec_name,
        audioCodec: audio?.codec_name ?? null,
        bitRate: Number.isSafeInteger(bitRate) ? bitRate : null,
      };
    });
  }

  async generateThumbnail(
    sourceKey: string,
    outputKey: string,
  ): Promise<void> {
    await this.withSource(sourceKey, async (sourcePath, directory) => {
      const outputPath = join(directory, 'thumbnail.jpg');
      await this.run(process.env.FFMPEG_PATH ?? 'ffmpeg', [
        '-y', '-ss', '1', '-i', sourcePath,
        '-frames:v', '1', '-vf', 'scale=1280:-2',
        outputPath,
      ]);
      await this.storage.uploadFile(outputKey, outputPath, 'image/jpeg');
    });
  }

  async generatePreview(
    sourceKey: string,
    outputKey: string,
  ): Promise<void> {
    await this.withSource(sourceKey, async (sourcePath, directory) => {
      const outputPath = join(directory, 'preview.mp4');
      await this.run(process.env.FFMPEG_PATH ?? 'ffmpeg', [
        '-y', '-i', sourcePath, '-t', '30',
        '-vf', 'scale=1280:-2',
        '-c:v', 'libx264', '-preset', 'veryfast',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        outputPath,
      ]);
      await this.storage.uploadFile(outputKey, outputPath, 'video/mp4');
    });
  }

  async generateHlsRenditions(
    sourceKey: string,
    outputPrefix: string,
  ): Promise<void> {
    await this.withSource(sourceKey, async (sourcePath, directory) => {
      const outputDirectory = join(directory, 'hls-output');
      const renditions = [
        { name: '1080p', width: 1920, height: 1080, bitrate: '5000k', bandwidth: 5500000 },
        { name: '720p', width: 1280, height: 720, bitrate: '2800k', bandwidth: 3100000 },
        { name: '480p', width: 854, height: 480, bitrate: '1400k', bandwidth: 1600000 },
        { name: '360p', width: 640, height: 360, bitrate: '800k', bandwidth: 900000 },
      ];

      for (const rendition of renditions) {
        const renditionDir = join(outputDirectory, rendition.name);
        await mkdir(renditionDir, { recursive: true });
        const playlistPath = join(renditionDir, 'index.m3u8');
        const segmentPattern = join(renditionDir, 'segment_%05d.ts');
        await this.run(process.env.FFMPEG_PATH ?? 'ffmpeg', [
          '-y', '-i', sourcePath,
          '-vf', `scale=${rendition.width}:${rendition.height}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
          '-c:v', 'libx264', '-preset', 'veryfast',
          '-b:v', rendition.bitrate,
          '-c:a', 'aac', '-b:a', '128k',
          '-hls_time', '6', '-hls_playlist_type', 'vod',
          '-hls_segment_filename', segmentPattern,
          playlistPath,
        ]);
      }

      const masterLines = ['#EXTM3U', '#EXT-X-VERSION:3'];
      for (const rendition of renditions) {
        masterLines.push(
          `#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bandwidth},RESOLUTION=${rendition.width}x${rendition.height}`,
          `${rendition.name}/index.m3u8`,
        );
      }
      const masterPath = join(outputDirectory, 'master.m3u8');
      await writeFile(masterPath, `${masterLines.join('\n')}\n`);

      await this.uploadDirectory(outputDirectory, outputPrefix);
    });
  }

  private async withSource<T>(
    sourceKey: string,
    operation: (sourcePath: string, directory: string) => Promise<T>,
  ): Promise<T> {
    const source = await this.getSource(sourceKey);
    const outputDirectory = await mkdtemp(join(tmpdir(), 'cine-output-'));
    try {
      return await operation(source.sourcePath, outputDirectory);
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  }

  async releaseSource(sourceKey: string): Promise<void> {
    const cached = this.sourceCache.get(sourceKey);
    this.sourceCache.delete(sourceKey);
    if (!cached) {
      return;
    }

    try {
      const source = await cached;
      await rm(source.directory, { recursive: true, force: true });
    } catch {
      return;
    }
  }

  private getSource(
    sourceKey: string,
  ): Promise<{ directory: string; sourcePath: string }> {
    let cached = this.sourceCache.get(sourceKey);
    if (cached) {
      return cached;
    }

    cached = (async () => {
      const directory = await mkdtemp(join(tmpdir(), 'cine-source-'));
      const sourcePath = join(directory, basename(sourceKey) || 'source.bin');
      try {
        await this.storage.downloadObject(sourceKey, sourcePath);
        return { directory, sourcePath };
      } catch (error) {
        await rm(directory, { recursive: true, force: true });
        throw error;
      }
    })();
    this.sourceCache.set(sourceKey, cached);

    void cached.catch(() => {
      if (this.sourceCache.get(sourceKey) === cached) {
        this.sourceCache.delete(sourceKey);
      }
    });
    return cached;
  }

  private async uploadDirectory(
    directory: string,
    outputPrefix: string,
    root = directory,
  ): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await this.uploadDirectory(fullPath, outputPrefix, root);
      } else {
        const key = `${outputPrefix}/${relative(root, fullPath).replace(/\\/g, '/')}`;
        const contentType = entry.name.endsWith('.m3u8')
          ? 'application/vnd.apple.mpegurl'
          : 'video/mp2t';
        await this.storage.uploadFile(key, fullPath, contentType);
      }
    }
  }

  private run(binary: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(binary, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk: string) => {
        stderr = (stderr + chunk).slice(-16000);
      });
      child.once('error', reject);
      child.once('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(
            new Error(
              `${binary} exited with code ${code}: ${stderr.trim()}`,
            ),
          );
        }
      });
    });
  }
}