# Production Deployment Checklist

## Before You Deploy

1. Copy `.env.production.example` to `.env.production`.
2. Fill `DATABASE_URL`, `SUPABASE_*`, `R2_*`, `SMTP_*`, and at least one alert target (`ALERT_WEBHOOK_URL` or `ALERT_EMAIL_TO`).
3. Confirm `COMPOSE_PROJECT_NAME`, `AI_WARDROBE_RELEASE_TAG`, `GATEWAY_HTTP_PORT`, and `BACKEND_PUBLIC_BASE_URL`.
4. Verify `LOCAL_STORAGE_ROOT=./data/assets` and `MODEL_TRAINING_DIR=./model_training` still match your server layout.
5. If you use Supabase Postgres, run [`infra/supabase/productized_schema.sql`](../infra/supabase/productized_schema.sql) against the target project before first release.
6. Make sure the server has Docker, Docker Compose v2, and enough disk for `data/`, `model_training/`, and Redis persistence.

## First Production Bring-Up

1. Run `docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml up -d --build`.
2. Run `python infra/scripts/release_ops.py verify`.
3. Check `/api/v1/health/live`, `/api/v1/health/ready`, and `/api/v1/health/dependencies` through the public base URL.
4. Confirm nginx is serving `/nginx-health`.
5. If external providers are configured, optionally run `python infra/scripts/release_ops.py verify --cloud-smoke`.

## Standard Release Flow

1. Pick a release tag such as `release-20260411-1`.
2. Run `python infra/scripts/release_ops.py deploy --release-tag release-20260411-1`.
3. Watch `docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml logs -f`.
4. Confirm the release marker in `infra/runtime/current-release.json`.

## Backup Expectations

1. Run `python infra/scripts/release_ops.py backup` before any risky maintenance.
2. Confirm the backup folder appears under `infra/runtime/backups/`.
3. Make sure the backup includes `.env.production`, `data.tar.gz`, and `model_training.tar.gz`.
4. If Redis is part of the live stack, confirm `redis-data.tar.gz` exists too.

## Restore And Rollback

1. Restore application state with `python infra/scripts/release_ops.py restore --backup <label-or-path>`.
2. Roll back containers with `python infra/scripts/release_ops.py rollback`.
3. If you need a specific image tag, use `python infra/scripts/release_ops.py rollback --release-tag <older-tag>`.
4. Re-run `python infra/scripts/release_ops.py verify` after restore or rollback.

## Monitoring And Alerts

1. Keep `LOG_JSON=true` in production so request logs stay machine-parseable.
2. Keep `RATE_LIMIT_ENABLED=true` and `RATE_LIMIT_USE_REDIS=true`.
3. Configure at least one alert sink so `deployment_health_probe.py` and uncaught exceptions can notify ops.
4. Review nginx, backend, and Redis logs after every release.

## References

- Full runbook: [`docs/release-runbook.md`](./release-runbook.md)
- Production compose: [`infra/docker/docker-compose.production.yml`](../infra/docker/docker-compose.production.yml)
- Release operations CLI: [`infra/scripts/release_ops.py`](../infra/scripts/release_ops.py)
