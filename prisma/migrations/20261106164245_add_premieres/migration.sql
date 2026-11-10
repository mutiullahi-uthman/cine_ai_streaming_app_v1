CREATE TYPE "PremiereStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

CREATE TABLE "premieres" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "status" "PremiereStatus" NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "premieres_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "premieres_filmId_key" ON "premieres"("filmId");
CREATE INDEX "premieres_status_startsAt_idx" ON "premieres"("status", "startsAt");

ALTER TABLE "premieres"
    ADD CONSTRAINT "premieres_filmId_fkey"
    FOREIGN KEY ("filmId") REFERENCES "films"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
