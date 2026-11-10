import { Injectable } from '@nestjs/common';

type MetricName =
  | 'films_created_total'
  | 'film_ready_total'
  | 'upload_sessions_created_total'
  | 'upload_sessions_started_total'
  | 'uploads_completed_total'
  | 'uploads_failed_total'
  | 'uploads_expired_total'
  | 'processing_jobs_started_total'
  | 'processing_jobs_completed_total'
  | 'processing_jobs_failed_total'
  | 'playback_requests_total'
  | 'processing_duration_seconds'
  | 'hls_generation_duration_seconds'
  | 'playback_requests_in_flight'
  | 'outbox_pending_events'
  | 'outbox_oldest_pending_age_seconds';

interface Histogram {
  count: number;
  sum: number;
  buckets: number[];
}

const HISTOGRAM_BUCKETS = [0.1, 0.5, 1, 5, 15, 60, 300, 1800];
const HISTOGRAM_METRICS: readonly MetricName[] = [
  'processing_duration_seconds',
  'hls_generation_duration_seconds',
];

const EVENT_METRICS: Partial<Record<string, MetricName>> = {
  'film.created': 'films_created_total',
  'film.ready': 'film_ready_total',
  'upload.session.created': 'upload_sessions_created_total',
  'upload.started': 'upload_sessions_started_total',
  'upload.completed': 'uploads_completed_total',
  'upload.failed': 'uploads_failed_total',
  'upload.expired': 'uploads_expired_total',
  'processing.job.started': 'processing_jobs_started_total',
  'processing.job.completed': 'processing_jobs_completed_total',
  'processing.job.failed': 'processing_jobs_failed_total',
};

const COUNTER_HELP: Partial<Record<MetricName, string>> = {
  films_created_total: 'Number of films created.',
  film_ready_total: 'Number of films transitioned to READY.',
  upload_sessions_created_total: 'Number of upload sessions created.',
  upload_sessions_started_total: 'Number of upload sessions started.',
  uploads_completed_total: 'Number of completed uploads.',
  uploads_failed_total: 'Number of failed uploads.',
  uploads_expired_total: 'Number of expired upload sessions.',
  processing_jobs_started_total: 'Number of processing job attempts started.',
  processing_jobs_completed_total: 'Number of processing jobs completed.',
  processing_jobs_failed_total: 'Number of processing jobs permanently failed.',
  playback_requests_total: 'Number of playback URL requests.',
};

@Injectable()
export class MetricsService {
  private readonly counters = new Map<MetricName, number>();
  private readonly gauges = new Map<MetricName, number>();
  private readonly histograms = new Map<MetricName, Histogram>();

  incrementEvent(eventName: string): void {
    const metric = EVENT_METRICS[eventName];
    if (metric) {
      this.increment(metric);
    }
  }

  increment(name: MetricName, amount = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + amount);
  }

  setGauge(name: MetricName, value: number): void {
    this.gauges.set(name, value);
  }

  adjustGauge(name: MetricName, amount: number): void {
    this.gauges.set(name, (this.gauges.get(name) ?? 0) + amount);
  }

  observe(name: MetricName, value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      return;
    }

    let histogram = this.histograms.get(name);
    if (!histogram) {
      histogram = {
        count: 0,
        sum: 0,
        buckets: HISTOGRAM_BUCKETS.map(() => 0),
      };
      this.histograms.set(name, histogram);
    }

    histogram.count += 1;
    histogram.sum += value;
    HISTOGRAM_BUCKETS.forEach((upperBound, index) => {
      if (value <= upperBound) {
        histogram.buckets[index] += 1;
      }
    });
  }

  renderPrometheus(): string {
    const lines: string[] = [];
    for (const [name, help] of Object.entries(COUNTER_HELP)) {
      const metric = name as MetricName;
      lines.push(`# HELP ${metric} ${help}`, `# TYPE ${metric} counter`);
      lines.push(`${metric} ${this.counters.get(metric) ?? 0}`);
    }

    for (const name of [
      'playback_requests_in_flight',
      'outbox_pending_events',
      'outbox_oldest_pending_age_seconds',
    ] as const) {
      const help = this.getGaugeHelp(name);
      lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} gauge`);
      lines.push(`${name} ${this.gauges.get(name) ?? 0}`);
    }

    for (const name of HISTOGRAM_METRICS) {
      const histogram = this.histograms.get(name) ?? {
        count: 0,
        sum: 0,
        buckets: HISTOGRAM_BUCKETS.map(() => 0),
      };
      lines.push(
        `# HELP ${name} ${this.getHistogramHelp(name)}`,
        `# TYPE ${name} histogram`,
      );
      HISTOGRAM_BUCKETS.forEach((upperBound, index) => {
        lines.push(
          `${name}_bucket{le="${upperBound}"} ${histogram.buckets[index]}`,
        );
      });
      lines.push(
        `${name}_bucket{le="+Inf"} ${histogram.count}`,
        `${name}_sum ${histogram.sum}`,
        `${name}_count ${histogram.count}`,
      );
    }

    return `${lines.join('\n')}\n`;
  }

  private getGaugeHelp(name: MetricName): string {
    switch (name) {
      case 'playback_requests_in_flight':
        return 'Number of playback URL requests currently being handled.';
      case 'outbox_pending_events':
        return 'Number of events awaiting outbox publication.';
      case 'outbox_oldest_pending_age_seconds':
        return 'Age in seconds of the oldest event awaiting publication.';
      default:
        return '';
    }
  }

  private getHistogramHelp(name: MetricName): string {
    return name === 'processing_duration_seconds'
      ? 'Duration of processing job attempts in seconds.'
      : 'Duration of HLS generation steps in seconds.';
  }
}
