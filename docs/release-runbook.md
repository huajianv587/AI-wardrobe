# Release Runbook

## Scope

This runbook covers the web-facing production stack in this repo:

- `gateway` via nginx
- `frontend` via Next.js
- `backend` via FastAPI
- `redis` for distributed rate limiting and supporting runtime state

The release workflow is driven by [`infra/scripts/release_ops.py`](../infra/scripts/release_ops.py).

## Required Inputs

Prepare `.env.production` from [`.env.production.example`](../.env.production.example).

The most important values are:

- `COMPOSE_PROJECT_NAME`
- `AI_WARDROBE_RELEASE_TAG`
- `GATEWAY_HTTP_PORT`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `BACKEND_PUBLIC_BASE_URL`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT_URL`
- `REDIS_URL`
- `SMTP_*`
- `ALERT_WEBHOOK_URL` and/or `ALERT_EMAIL_TO`

## One-Time Server Prep

1. Install Docker Engine and Docker Compose v2.
2. Clone the repo onto the target server.
3. Create `.env.production`.
4. Ensure `data/` and `model_training/` live on durable storage.
5. If Supabase is the production database, run [`infra/supabase/productized_schema.sql`](../infra/supabase/productized_schema.sql).
6. If local fashion models are required, download them before the first release.

## First Deployment

1. Start the stack:

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml up -d --build
```

2. Verify health:

```bash
python infra/scripts/release_ops.py verify
```

3. Optional live-provider smoke:

```bash
python infra/scripts/release_ops.py verify --cloud-smoke
```

4. Review logs:

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml logs -f
```

## Standard Release

1. Choose a release tag:

```bash
export RELEASE_TAG=release-20260411-1
```

2. Deploy it:

```bash
python infra/scripts/release_ops.py deploy --release-tag "$RELEASE_TAG"
```

What this does:

- creates a predeploy backup under `infra/runtime/backups/`
- builds `ai-wardrobe-frontend:$RELEASE_TAG`
- builds `ai-wardrobe-backend:$RELEASE_TAG`
- brings the compose stack up with that tag
- runs the deployment health probe
- records release metadata in `infra/runtime/current-release.json`

## Manual Backup

Run this any time before risky maintenance:

```bash
python infra/scripts/release_ops.py backup
```

Each backup stores:

- `.env.production`
- rendered compose metadata when Docker is available
- `data.tar.gz`
- `model_training.tar.gz`
- `redis-data.tar.gz` when the Redis volume exists
- git commit and git status metadata

## Restore

To restore a named backup:

```bash
python infra/scripts/release_ops.py restore --backup predeploy-release-20260411-1
```

To restore and immediately restart the stack:

```bash
python infra/scripts/release_ops.py restore --backup predeploy-release-20260411-1 --start-stack
```

## Rollback

The default rollback path uses the last recorded `previous_release_tag` plus the matching predeploy backup:

```bash
python infra/scripts/release_ops.py rollback
```

To force a specific image tag:

```bash
python infra/scripts/release_ops.py rollback --release-tag release-20260410-2
```

To force a specific backup snapshot too:

```bash
python infra/scripts/release_ops.py rollback --release-tag release-20260410-2 --backup predeploy-release-20260411-1
```

## Monitoring Expectations

- `gateway` exposes `/nginx-health`
- `backend` exposes `/api/v1/health/live`
- `backend` exposes `/api/v1/health/ready`
- `backend` exposes `/api/v1/health/dependencies`
- backend logs support JSON output when `LOG_JSON=true`
- uncaught backend exceptions and failed deployment probes can notify ops

Recommended operator checks after every release:

1. `python infra/scripts/release_ops.py verify`
2. `docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml ps`
3. `docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml logs --tail=200 backend`
4. `docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml logs --tail=200 gateway`

## Operational Notes

- `docker compose` variable substitution now expects `--env-file .env.production`.
- The backend container reads local storage from `/app/data`, so the compose file mounts repo-root `data/` there.
- Release rollback assumes older tagged images still exist on the target host. Do not aggressively prune Docker images until the new release is accepted.
- `cloud_smoke_test.py` should only be used when SMTP, Supabase, R2, and remote AI providers are intentionally configured and billable.
