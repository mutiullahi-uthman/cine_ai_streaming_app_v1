ALTER TABLE "outbox_events"
    ADD COLUMN "correlationId" TEXT;

CREATE INDEX "outbox_events_correlationId_idx"
    ON "outbox_events"("correlationId");
