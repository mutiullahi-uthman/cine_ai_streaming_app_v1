CREATE TYPE "StreamingAssetStatus" AS ENUM ('GENERATING', 'READY', 'FAILED');

CREATE TABLE "streaming_assets" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "masterPlaylistKey" TEXT NOT NULL,
    "status" "StreamingAssetStatus" NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streaming_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "streaming_assets_mediaAssetId_key"
    ON "streaming_assets"("mediaAssetId");

CREATE INDEX "streaming_assets_filmId_status_createdAt_idx"
    ON "streaming_assets"("filmId", "status", "createdAt");

ALTER TABLE "streaming_assets"
    ADD CONSTRAINT "streaming_assets_filmId_fkey"
    FOREIGN KEY ("filmId") REFERENCES "films"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "streaming_assets"
    ADD CONSTRAINT "streaming_assets_mediaAssetId_fkey"
    FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
