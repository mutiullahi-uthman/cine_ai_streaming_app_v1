CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "FilmStatus" AS ENUM ('DRAFT', 'UPLOADING', 'PROCESSING', 'READY', 'PUBLISHED', 'FAILED');
CREATE TYPE "UploadStatus" AS ENUM ('CREATED', 'UPLOADING', 'COMPLETED', 'FAILED', 'EXPIRED');
CREATE TYPE "MediaStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "ProcessingStep" AS ENUM ('VALIDATION', 'METADATA_EXTRACTION', 'THUMBNAIL_GENERATION', 'TRANSCODING', 'HLS_GENERATION', 'FINALIZATION');

CREATE TABLE "films" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "premiereAt" TIMESTAMP(3),
    "status" "FilmStatus" NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "films_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "upload_sessions" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "storageUploadId" TEXT NOT NULL,
    "expectedSize" BIGINT NOT NULL,
    "status" "UploadStatus" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "etag" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "contentType" TEXT,
    "status" "MediaStatus" NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "processing_jobs" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "status" "ProcessingStatus" NOT NULL,
    "currentStep" "ProcessingStep",
    "attempts" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outbox_events_eventId_key" ON "outbox_events"("eventId");
CREATE INDEX "outbox_events_processedAt_idx" ON "outbox_events"("processedAt");
CREATE INDEX "outbox_events_aggregateId_idx" ON "outbox_events"("aggregateId");
CREATE INDEX "outbox_events_aggregateType_aggregateVersion_idx" ON "outbox_events"("aggregateType", "aggregateVersion");
CREATE INDEX "upload_sessions_filmId_idx" ON "upload_sessions"("filmId");
CREATE UNIQUE INDEX "media_assets_objectKey_key" ON "media_assets"("objectKey");
CREATE INDEX "media_assets_filmId_idx" ON "media_assets"("filmId");
CREATE INDEX "media_assets_status_idx" ON "media_assets"("status");
CREATE UNIQUE INDEX "processing_jobs_mediaAssetId_key" ON "processing_jobs"("mediaAssetId");
CREATE INDEX "processing_jobs_status_createdAt_idx" ON "processing_jobs"("status", "createdAt");

ALTER TABLE "media_assets"
    ADD CONSTRAINT "media_assets_filmId_fkey"
    FOREIGN KEY ("filmId") REFERENCES "films"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "processing_jobs"
    ADD CONSTRAINT "processing_jobs_mediaAssetId_fkey"
    FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
