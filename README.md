# CineAI Streaming Platform

CineAI is an indie streaming network for generative filmmakers. This service
provides the backend foundation for creator uploads, asynchronous media
processing, authenticated playback, premieres, notifications, and viewer
analytics.

This project addresses the failure scenario in which a premiere overwhelmed
application servers with large uploads, left incomplete records stuck in
processing, and delivered raw video that was expensive and unreliable to watch.
The design moves large file transfer and video processing off the synchronous
API path, persists workflow state, and prepares adaptive HLS assets for CDN
delivery.

> **Capacity note:** the 30 creators and 12,000 viewers in the incident
> scenario are design inputs, not load-test results. This repository does not
> claim that the current configuration has been benchmarked or proven to serve
> that audience in production.

## Architecture and end-to-end data flow

The architecture and data flow below define the intended system boundaries:
the API coordinates work and enforces policy; object storage carries large
files; PostgreSQL is the source of truth; Redis/BullMQ distributes background
work; workers process media; and a CDN delivers playback assets.

```mermaid
flowchart LR
    Creator[Creator client] -->|API: create film and upload session| API[NestJS API]
    Creator -->|Signed multipart part URLs| ObjectStore[(S3-compatible object storage)]
    API -->|Upload session, film, media, jobs| DB[(PostgreSQL)]
    API -->|Domain events via transactional outbox| DB
    DB -->|Poll pending events| Publisher[Outbox publisher]
    Publisher -->|Idempotent jobs| Redis[(Redis / BullMQ)]
    Redis --> Worker[Background worker]
    Worker -->|Read original, write poster, preview and HLS| ObjectStore
    Worker -->|Status, progress, duration| DB
    Viewer[Viewer client] -->|Authenticated API request| API
    API -->|Scoped signed cookies| Viewer
    Viewer -->|HLS playlists and segments| CDN[CloudFront CDN]
    CDN --> ObjectStore
    API -->|SMTP workflow notifications| Email[Email provider]
    Viewer -->|Playback sessions and heartbeats| API
    API -->|Analytics records| DB
```

### Upload-to-playback flow

1. A creator registers or signs in, creates a film, and requests an upload
   session. The API checks the creator's ownership and stores an expiring upload
   record.
2. The API initiates an S3-compatible multipart upload and returns short-lived,
   presigned URLs for the requested parts. The client sends file parts directly
   to object storage; video bytes do not pass through the API process.
3. If a connection drops, the client can retry failed parts and continue using
   the active multipart upload rather than sending the whole file again, while
   its presigned URLs remain valid. The client submits part numbers and ETags
   to complete the upload.
4. The API asks object storage to complete the multipart upload and verifies the
   completed object exists and its size matches the declared size before
   accepting it.
5. Domain changes and events are recorded using a PostgreSQL outbox. A publisher
   dispatches pending events to Redis-backed queues. A separate worker creates
   and tracks processing jobs; HTTP requests do not wait for FFmpeg.
6. The worker downloads the original to temporary local storage, validates
   metadata with FFprobe, generates a thumbnail and a 30-second preview, and
   transcodes four HLS VOD renditions. It uploads the playlists and segments,
   then marks the media ready only after processing has completed.
7. An authenticated viewer requests playback for a ready or published film.
   The API returns the master playlist URL and grants a five-minute,
   film-path-scoped CloudFront signed-cookie session. The player's HLS client
   fetches the master playlist, rendition playlists, and segments from the CDN.

The outbox and persisted processing state make background work recoverable
across process restarts. Queue jobs use stable identifiers to reduce duplicate
enqueues; handlers and external side effects should still be treated as
at-least-once, not exactly-once.

## Why this approach

| Incident requirement | Current approach | Benefit and trade-off |
| --- | --- | --- |
| Uploads survive unstable networks | Presigned multipart uploads directly to object storage; upload sessions and part completion are recorded | Retries can be limited to failed parts and API bandwidth/memory are not consumed by video bytes. Requires a client that persists upload state and handles expired signed URLs. |
| Keep the API responsive | PostgreSQL outbox, Redis/BullMQ, and a separate worker process | Slow FFmpeg jobs do not occupy API request handlers. Adds operational dependencies and eventual consistency between a request and its completed media. |
| Avoid stuck or lost processing work | Persisted processing steps, periodic pending-job scans, stale-job recovery, bounded retries, and a dead-letter queue | Work can be retried and diagnosed. Retries can repeat external work, and dead-letter jobs require operator inspection/replay. |
| Stream across different network speeds | HLS VOD with 1080p, 720p, 480p, and 360p renditions; CDN-oriented object paths | Players can select a rendition based on conditions and fetch small segments rather than a full original. More storage, encoding time, and CDN egress are required. |
| Limit playback access | Authenticated API access and short-lived CloudFront signed cookies scoped to a film's HLS path | Playlist-relative segment requests remain protected. Requires correct CloudFront key, cookie-domain, CORS, and client credential configuration. |

## What is implemented

### Creator, identity, and catalog

- Registration, login, refresh-token rotation, logout, and authenticated user
  lookup.
- Registration creates a `VIEWER`; creator and administrator privileges are
  provisioned through a trusted operator process, not a public role-selection
  endpoint.
- Film creation, listing, publishing, failure handling, ownership checks, and
  creator/admin authorization.
- Multipart upload-session creation, lookup, completion, abort, and listing.
  Sessions expire after 24 hours; expired multipart uploads are cleaned up.
- Creator-facing processing status with current step, estimated progress, and
  last update time.

### Processing and playback

- FFprobe metadata extraction, thumbnail generation, a 30-second MP4 preview,
  and HLS VOD generation with 1080p, 720p, 480p, and 360p variants.
- HLS playlists, variant playlists, and referenced segments are checked before
  a film is marked ready.
- Playback is available only for ready or published films and requires an
  authenticated viewer.
- CloudFront custom-policy signed cookies expire after five minutes and are
  restricted to the requested film's HLS path.

### Premières, notifications, and analytics

- Creators can schedule one premiere for a ready film, query its status, cancel
  a scheduled premiere, and end a live premiere. A scheduled premiere goes live
  within ten seconds of its start time; ending it is manual.
- Workflow email notifications cover ready/published films, terminal processing
  failures, and expired upload sessions. SMTP credentials are optional until
  email delivery is needed.
- Authenticated viewers can create playback sessions, send playback/pause
  heartbeats, and end sessions. Creator/admin reports include views, distinct
  authenticated accounts, watch time, completion, devices, and HLS renditions.

### Reliability and observability

- PostgreSQL transactional outbox with correlation IDs and periodic publishing.
- Redis/BullMQ processing, notification, and cleanup queues with bounded
  exponential retries. Processing jobs are limited to four domain attempts;
  failed jobs are retained for inspection and dead-lettered after queue retries.
- Pending processing jobs are scanned every 30 seconds; processing jobs without
  a recent heartbeat are recovered every five minutes. Expired multipart
  uploads are checked every 15 minutes.
- Structured JSON logs and an `x-request-id` response header. Incoming valid
  request IDs are preserved and propagated through outbox events.
- Prometheus text-format metrics at `GET /api/v1/metrics`, including workflow
  counters, processing/HLS duration histograms, in-flight playback requests,
  and outbox backlog/age. Access is restricted to administrators.
- Health endpoint at `GET /api/v1/health`.

## API and Swagger UI

The API is versioned under `/api/v1`. Interactive API documentation is served
at [`http://localhost:3000/api/docs`](http://localhost:3000/api/docs) when the
local API is running. The OpenAPI JSON is at
[`http://localhost:3000/api/docs/openapi.json`](http://localhost:3000/api/docs/openapi.json).
Use the **Authorize** control to provide a bearer access token for protected
operations.

![CineAI Streaming API Swagger UI](./swaggerUI.png)

Representative endpoints:

| Purpose | Endpoint |
| --- | --- |
| Health | `GET /api/v1/health` |
| Register / login / refresh / logout | `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout` |
| Current account | `GET /api/v1/auth/me` |
| Films | `POST /api/v1/films`, `GET /api/v1/films`, `GET /api/v1/films/:filmId` |
| Upload sessions | `POST /api/v1/films/:filmId/uploads`, `POST /api/v1/uploads/:id/complete`, `DELETE /api/v1/uploads/:id` |
| Processing status | `GET /api/v1/creator/films/:id/status` |
| Playback | `GET /api/v1/films/:filmId/play` |
| Premiere | `POST /api/v1/films/:filmId/premiere`, `GET /api/v1/films/:filmId/premiere` |
| Viewer analytics | `POST /api/v1/films/:filmId/analytics/sessions`, `PATCH /api/v1/analytics/sessions/:sessionId/heartbeat`, `POST /api/v1/analytics/sessions/:sessionId/end` |
| Operational metrics | `GET /api/v1/metrics` |

The OpenAPI document is generated from the NestJS controllers and DTOs. Treat
the running specification as the source for request and response details.

## Technology and runtime layout

- **API and worker:** TypeScript, Node.js 22, and NestJS. The worker is a
  separate process/container from the HTTP API.
- **Persistence:** PostgreSQL through Prisma; six checked-in migrations define
  the current schema.
- **Queue and cache infrastructure:** Redis and BullMQ. Redis is used by the
  job queues; the Redis cache provider is also available.
- **Media/object storage:** S3-compatible multipart object storage through the
  AWS SDK. `S3_ENDPOINT` supports compatible local or hosted endpoints.
- **Transcoding:** FFmpeg and FFprobe installed in the runtime image.
- **Delivery:** CloudFront signed-cookie integration for protected HLS
  playback. A distribution and its origin are provisioned outside this repo.
- **Email:** SMTP, including Gmail SMTP using a Google App Password.
- **Containers:** Docker Compose starts PostgreSQL, Redis, a one-shot migration
  service, API, and worker. It does not provision object storage, CloudFront,
  SMTP, or a production hosting environment.

## Local development

Prerequisites: Docker with Compose, Node.js 22, and an S3-compatible object
store reachable from the API and worker containers. The Compose file does not
start MinIO or another object store.

1. Copy `.env.example` to `.env`. Replace placeholder credentials; use a
   randomly generated `JWT_SECRET` of at least 32 bytes. Keep `.env` private
   and out of source control.
2. Set `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`. Set
   `DATABASE_URL` to those same values. When the application runs in Compose,
   the database hostname must be `postgres`, for example:

   ```text
   postgresql://cineai:your-password@postgres:5432/cineai?schema=public
   ```

   Use `localhost` only when connecting from a process running directly on the
   host. URL-encode special characters in database credentials.
3. Set `REDIS_PASSWORD` and include the same password in `REDIS_URL`. Within
   Compose, the Redis hostname is `redis`. Redis is not published to a host
   port by default.
4. Configure `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY`.
   Set `S3_ENDPOINT` for a non-AWS S3-compatible service. The endpoint must be
   reachable from inside the containers; `localhost` inside a container means
   that container, not the host or another service.
5. Start the stack:

   ```sh
   docker compose up --build
   ```

6. Open Swagger UI at <http://localhost:3000/api/docs>. The default host port
   can be changed with `PORT`.

To run validation and tests locally:

```sh
npm ci
npm run prisma:validate
npm run prisma:generate
npm test
npm run typecheck
npm run build
```

`docker compose down` stops the stack while retaining named volumes.
`docker compose down -v` deletes the local PostgreSQL and Redis data; use it
only when intentionally discarding that data.

### Configuration reference

| Variable | Required | Notes |
| --- | --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Local Compose | Database initialization values; must match `DATABASE_URL`. |
| `DATABASE_URL` | Yes | Prisma URL. Use `postgres` as hostname from Compose containers. |
| `REDIS_PASSWORD`, `REDIS_URL` | Local Compose | Compose Redis uses password authentication. Use `redis` as the in-network hostname. |
| `JWT_SECRET` | Yes | At least 32 bytes; keep in a secret manager in deployed environments. |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Yes | Credentials for the object store. Prefer workload identity/short-lived credentials where supported in production. |
| `S3_ENDPOINT` | Provider-dependent | Set for S3-compatible storage such as a local object-store service; blank for AWS S3. |
| `CDN_BASE_URL`, `CDN_COOKIE_DOMAIN`, `CLOUDFRONT_KEY_PAIR_ID`, `CLOUDFRONT_PRIVATE_KEY` | Playback | Required to issue CloudFront playback access. Configure a matching trusted public key in CloudFront; store the private key as a secret. |
| `SMTP_HOST`, `SMTP_FROM` | Email delivery | SMTP server and sender address. `SMTP_USER` and `SMTP_PASSWORD` must be set together. |
| `SMTP_PORT`, `SMTP_SECURE` | Optional | Defaults to port 587 and STARTTLS; use port 465 with `SMTP_SECURE=true` for implicit TLS. |
| `PORT` | Optional | Published API host port; defaults to `3000`. Container API listens on port `3000`. |
| `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_SECONDS` | Optional | Positive integer token lifetimes; defaults are 15 minutes and 30 days. |
| `JWT_ISSUER`, `JWT_AUDIENCE` | Optional | Override JWT issuer and audience. |
| `OUTBOX_BACKLOG_WARNING_THRESHOLD`, `OUTBOX_AGE_WARNING_SECONDS` | Optional | Outbox warning thresholds; defaults are `1000` events and `300` seconds. |

For Gmail SMTP, enable 2-Step Verification and create a Google App Password.
Use `smtp.gmail.com`, port `587`, `SMTP_SECURE=false`, and the Gmail address as
both `SMTP_FROM` and `SMTP_USER`. Do not use the normal Google account password.

## Database migrations

The initial migration is for a **new, empty database**. Compose runs
`prisma migrate deploy` before starting the API and worker. To run it manually:

```sh
npm run prisma:migrate:deploy
```

The Prisma schema is `prisma/prisma.schema` (not Prisma's default
`prisma/schema.prisma`). If a migration reports `P3005` because the database
already contains tables, stop: do not drop data or mark migrations applied
blindly. Back up the database, inspect `_prisma_migrations`, compare the live
schema with all six migration files, and reconcile/baseline history as a
separate reviewed database operation. Existing production data requires an
explicit migration plan.

## Security and operational requirements

- Access tokens are short-lived JWTs. Refresh tokens are opaque, stored as
  hashes, and rotated on successful refresh; logout revokes the presented
  refresh token.
- Film creation, uploads, processing details, and publishing are
  role/ownership-checked. Public registration cannot grant creator/admin
  privileges.
- Do not commit `.env`, storage credentials, SMTP passwords, or the CloudFront
  private key. Use a secret manager and least-privilege storage policies in
  production.
- Restrict the metrics endpoint to trusted monitoring infrastructure as well
  as requiring its administrator token.
- Use TLS for external database, Redis, object storage, SMTP, API, and CDN
  connections. The local Compose stack is a development setup, not a hardened
  production deployment.
- Configure backups and restore drills for PostgreSQL and object storage,
  Redis persistence/availability appropriate to queue recovery, log retention,
  alert routing, resource limits, and an incident/replay runbook before
  production launch.

## Constraints and known trade-offs

The current implementation is a production-minded foundation, not a
pre-provisioned, load-tested production service:

- **No production deployment target is configured.** GitHub Actions validates,
  tests, builds containers, and publishes images to GHCR on pushes to `main`
  and version tags; it does not deploy them.
- **Transcoding is resource intensive.** Renditions are fixed and encoded
  sequentially. A worker downloads the source to local temporary disk before
  processing; worker disk, memory, CPU, and network throughput constrain job
  size and concurrency.
- **Worker concurrency defaults to one processing job per worker process.**
  This protects a small host from unbounded FFmpeg contention but limits
  throughput. Additional replicas need capacity planning and queue monitoring.
- **HLS output is VOD, not live streaming.** Four preset renditions do not
  guarantee every source has suitable quality at every bitrate. Audio/video
  sync and playback quality depend on input validation, encoders, CDN, client,
  and real-device testing.
- **Storage and CDN infrastructure are external.** This repo does not provision
  buckets, lifecycle/retention policies, CloudFront distributions, TLS
  domains, CORS rules, or origin access controls.
- **Upload resumption needs client support.** The backend returns presigned
  part URLs that expire after one hour, while upload records expire after 24
  hours. There is no part-URL refresh endpoint; a client must persist session
  and part state, retry within the URL lifetime, and define recovery for an
  expired or abandoned multipart upload.
- **No viewer application/player is included.** The API supplies playback URLs
  and signed cookies; adaptive rendition selection, player telemetry, browser
  compatibility, and audio/video synchronization need a client integration
  and real-device validation.
- **Metrics counters are process-local.** They reset on restart. Viewer
  analytics are derived from client-supplied heartbeats (watch time is capped
  at 60 seconds per heartbeat), so they are indicative and not suitable for
  billing or security decisions. Country and trusted bandwidth metrics are
  not implemented.
- **Notifications are at-least-once.** A mail provider may accept a message
  before an acknowledgement failure; retries can send a duplicate.
- **Dead-letter jobs have no automatic replay policy.** Operators must inspect
  the cause and explicitly replay after remediation.
- **Rate limiting and multi-region failover are not implemented.** Deploy
  appropriate edge/API controls and recovery objectives before public launch.
- **Premiere lifecycle transitions are application-scheduled.** Start
  transitions are checked within ten seconds of the scheduled time; ending a
  live premiere is manual.

## What to improve at scale

Prioritize these steps based on measurements and launch requirements:

1. **Establish SLOs and load baselines.** Test upload retries, API latency,
   queue lag, encoding time, playback startup/rebuffering, and CDN egress using
   representative source files, mobile networks, and concurrent-viewer load.
   The incident's 12,000-viewer figure should become a measured capacity target,
   not an assumption.
2. **Scale encoding deliberately.** Use a dedicated worker pool with CPU,
   memory, temporary-disk, and per-tenant concurrency limits. Autoscale against
   queue age and backlog; select renditions from source dimensions/bitrate and
   consider a managed transcoding service or GPU/accelerated workers where the
   economics support it.
3. **Strengthen upload orchestration.** Persist client-side session/part state,
   refresh expiring part URLs, enforce per-user quotas and maximum duration/file
   size, validate content independently of filename, and define cleanup and
   retention policies for abandoned originals and renditions.
4. **Harden delivery.** Provision CloudFront with private origin access,
   versioned/cache-safe object keys, correct CORS/cookie domains, origin
   shielding where useful, and dashboards for cache hit ratio, egress, and
   playback QoE. Exercise signed-cookie expiry and revocation behavior in
   supported browsers and players.
5. **Harden data and queue operations.** Add production backups/PITR and restore
   tests, database connection-pool and index reviews, Redis HA and queue
   retention policies, alerting on outbox age/queue lag/dead letters, and
   documented safe replay procedures. Move high-volume analytics to an
   append-oriented event pipeline/warehouse if PostgreSQL reporting begins to
   compete with transactional workloads.
6. **Complete production security and delivery controls.** Add rate limits,
   abuse/quota controls, secret rotation, audit trails for privileged actions,
   dependency/image scanning, staged deployment and rollback automation, and
   a disaster-recovery exercise. Add country/bandwidth analytics only from
   trusted CDN or proxy telemetry.

## CI

The GitHub Actions workflow runs `npm ci`, Prisma validation and client
generation, unit tests, TypeScript type-checking, the production build, and a
Docker build. On pushes to `main` and version tags it publishes versioned
container images to GitHub Container Registry. Deployment, environment
secrets, and production infrastructure remain the responsibility of the
deployment platform.
