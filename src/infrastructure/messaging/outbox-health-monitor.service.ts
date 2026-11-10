import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { MetricsService } from '../observability/metrics.service';
import { StructuredLogger } from '../observability/structured-logger.service';
import { OutboxRepository } from './outbox.repository';

@Injectable()
export class OutboxHealthMonitor {
  private isChecking = false;
  private lastWarningAt: number | null = null;
  private readonly backlogWarningThreshold = this.readThreshold(
    'OUTBOX_BACKLOG_WARNING_THRESHOLD',
    1000,
  );
  private readonly ageWarningSeconds = this.readThreshold(
    'OUTBOX_AGE_WARNING_SECONDS',
    300,
  );

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly metrics: MetricsService,
    private readonly logger: StructuredLogger,
  ) {}

  @Cron('*/30 * * * * *')
  async checkHealth(): Promise<void> {
    if (this.isChecking) {
      return;
    }

    this.isChecking = true;
    try {
      const health = await this.outboxRepository.getHealth();
      const oldestAgeSeconds = health.oldestPendingAt
        ? Math.max(
            0,
            (Date.now() - health.oldestPendingAt.getTime()) / 1000,
          )
        : 0;

      this.metrics.setGauge('outbox_pending_events', health.pendingCount);
      this.metrics.setGauge(
        'outbox_oldest_pending_age_seconds',
        oldestAgeSeconds,
      );

      if (
        health.pendingCount >= this.backlogWarningThreshold ||
        oldestAgeSeconds >= this.ageWarningSeconds
      ) {
        const now = Date.now();
        if (
          this.lastWarningAt === null ||
          now - this.lastWarningAt >= 5 * 60 * 1000
        ) {
          this.logger.warn('Outbox health threshold exceeded.', {
            pendingCount: health.pendingCount,
            oldestPendingAgeSeconds: oldestAgeSeconds,
            backlogWarningThreshold: this.backlogWarningThreshold,
            ageWarningSeconds: this.ageWarningSeconds,
          });
          this.lastWarningAt = now;
        }
      } else {
        this.lastWarningAt = null;
      }
    } catch (error) {
      this.logger.error('Failed to check outbox health.', error);
    } finally {
      this.isChecking = false;
    }
  }

  private readThreshold(name: string, defaultValue: number): number {
    const configured = process.env[name];
    if (configured === undefined) {
      return defaultValue;
    }

    const value = Number(configured);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${name} must be a positive number.`);
    }

    return value;
  }
}
