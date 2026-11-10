ALTER TABLE "media_assets"
    ADD COLUMN "durationSeconds" DOUBLE PRECISION;

CREATE TABLE "view_sessions" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "device" TEXT,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "watchDurationSeconds" INTEGER NOT NULL DEFAULT 0,
    "completionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "view_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "view_rendition_usage" (
    "id" TEXT NOT NULL,
    "viewSessionId" TEXT NOT NULL,
    "rendition" TEXT NOT NULL,
    "watchDurationSeconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "view_rendition_usage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "view_sessions_filmId_startedAt_idx"
    ON "view_sessions"("filmId", "startedAt");
CREATE INDEX "view_sessions_viewerId_filmId_idx"
    ON "view_sessions"("viewerId", "filmId");
CREATE INDEX "view_sessions_mediaAssetId_idx"
    ON "view_sessions"("mediaAssetId");
CREATE UNIQUE INDEX "view_rendition_usage_viewSessionId_rendition_key"
    ON "view_rendition_usage"("viewSessionId", "rendition");
CREATE INDEX "view_rendition_usage_rendition_idx"
    ON "view_rendition_usage"("rendition");

ALTER TABLE "view_sessions"
    ADD CONSTRAINT "view_sessions_filmId_fkey"
    FOREIGN KEY ("filmId") REFERENCES "films"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "view_sessions"
    ADD CONSTRAINT "view_sessions_viewerId_fkey"
    FOREIGN KEY ("viewerId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "view_sessions"
    ADD CONSTRAINT "view_sessions_mediaAssetId_fkey"
    FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "view_rendition_usage"
    ADD CONSTRAINT "view_rendition_usage_viewSessionId_fkey"
    FOREIGN KEY ("viewSessionId") REFERENCES "view_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
