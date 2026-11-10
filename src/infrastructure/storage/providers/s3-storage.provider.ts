import { Injectable } from '@nestjs/common';

import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { ConfigService } from '@nestjs/config';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { StorageProvider } from '../contracts/storage-provider.interface';

import { MultipartUploadSession } from '../contracts/multipart-upload-session.interface';

@Injectable()
export class S3StorageProvider
  implements StorageProvider
{
  private readonly bucket: string;

  private readonly signedUrlExpiry =
    3600;

  private readonly client: S3Client;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.bucket =
      this.configService.getOrThrow<string>(
        'S3_BUCKET',
      );

    this.client = new S3Client({
      region:
        this.configService.getOrThrow<string>(
          'S3_REGION',
        ),

      endpoint:
        this.configService.get<string>(
          'S3_ENDPOINT',
        ),

      credentials: {
        accessKeyId:
          this.configService.getOrThrow<string>(
            'S3_ACCESS_KEY',
          ),

        secretAccessKey:
          this.configService.getOrThrow<string>(
            'S3_SECRET_KEY',
          ),
      },

      forcePathStyle: true,
    });
  }

  async createMultipartUpload(
    objectKey: string,
    totalParts: number,
  ): Promise<MultipartUploadSession> {
    const upload =
      await this.client.send(
        new CreateMultipartUploadCommand(
          {
            Bucket: this.bucket,
            Key: objectKey,
          },
        ),
      );

    if (!upload.UploadId) {
      throw new Error(
        'Failed to create multipart upload.',
      );
    }

    const uploadId =
      upload.UploadId;

    const parts = await Promise.all(
      Array.from(
        { length: totalParts },
        async (_, index) => {
          const partNumber =
            index + 1;

          const url =
            await getSignedUrl(
              this.client,
              {
                input: {
                  Bucket:
                    this.bucket,
                  Key:
                    objectKey,
                  UploadId:
                    uploadId,
                  PartNumber:
                    partNumber,
                },
                middlewareStack:
                  this.client.middlewareStack,
                resolveMiddleware:
                  () => {
                    throw new Error();
                  },
              } as any,
              {
                expiresIn:
                  this.signedUrlExpiry,
              },
            );

          return {
            partNumber,
            uploadUrl: url,
          };
        },
      ),
    );

    return {
      uploadId,
      objectKey,
      expiresIn:
        this.signedUrlExpiry,
      parts,
    };
  }

  async completeMultipartUpload(
    uploadId: string,
    objectKey: string,
    parts: {
      etag: string;
      partNumber: number;
    }[],
  ): Promise<void> {
    await this.client.send(
      new CompleteMultipartUploadCommand(
        {
          Bucket: this.bucket,

          Key: objectKey,

          UploadId: uploadId,

          MultipartUpload: {
            Parts: parts.map(
              (part) => ({
                ETag:
                  part.etag,

                PartNumber:
                  part.partNumber,
              }),
            ),
          },
        },
      ),
    );
  }

  async abortMultipartUpload(
    uploadId: string,
    objectKey: string,
  ): Promise<void> {
    try {
      await this.client.send(
        new AbortMultipartUploadCommand({
          Bucket: this.bucket,
          Key: objectKey,
          UploadId: uploadId,
        }),
      );
    } catch (error) {
      if (
        error instanceof S3ServiceException &&
        error.name === 'NoSuchUpload'
      ) {
        return;
      }

      throw error;
    }
  }

  async objectExists(
    objectKey: string,
  ): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
        }),
      );

      return true;
    } catch (error) {
      if (
        error instanceof S3ServiceException &&
        (
          error.name === 'NotFound' ||
          error.name === 'NoSuchKey' ||
          error.$metadata.httpStatusCode === 404
        )
      ) {
        return false;
      }

      throw error;
    }
  }

  async getObjectText(
    objectKey: string,
  ): Promise<string> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }),
    );

    if (!response.Body) {
      throw new Error(`Object ${objectKey} has no readable body.`);
    }

    return response.Body.transformToString();
  }

  async getObjectMetadata(
    objectKey: string,
  ): Promise<{
    size: number;
    etag: string;
    contentType?: string;
  } | null> {
    try {
      const response =
        await this.client.send(
          new HeadObjectCommand({
            Bucket: this.bucket,
            Key: objectKey,
          }),
        );

      return {
        size: Number(
          response.ContentLength ?? 0,
        ),

        etag:
          response.ETag ?? '',

        contentType:
          response.ContentType,
      };
    } catch (error) {
      if (
        error instanceof S3ServiceException &&
        (
          error.name === 'NotFound' ||
          error.name === 'NoSuchKey' ||
          error.$metadata.httpStatusCode === 404
        )
      ) {
        return null;
      }

      throw error;
    }
  }

  async downloadObject(
    objectKey: string,
    destinationPath: string,
  ): Promise<void> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }),
    );

    if (!response.Body) {
      throw new Error(`Object ${objectKey} has no readable body.`);
    }

    await mkdir(dirname(destinationPath), { recursive: true });
    await pipeline(
      Readable.from(
        response.Body as AsyncIterable<Uint8Array>,
      ),
      createWriteStream(destinationPath),
    );
  }

  async uploadFile(
    objectKey: string,
    sourcePath: string,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: createReadStream(sourcePath),
        ContentType: contentType,
      }),
    );
  }
}