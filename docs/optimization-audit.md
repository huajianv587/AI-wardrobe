# Optimization Audit

This audit reflects the repository state after the queue migration, UTF-8 cleanup pass, Windows runtime hardening, and full validation run on April 20, 2026.

## Landed In This Pass

- `/try-on` first-load JavaScript dropped from roughly `396 kB` to `163 kB` after route-level lazy loading for the 3D stage.
- Local development now supports a real `Redis -> RQ -> worker` path through `backend/.venv`, `start-redis.cmd`, `start-worker.cmd`, `start-web-stack.cmd`, and `backend/scripts/smoke_queue_validation.py`.
- The deployment probe now supports `--base-url` and validates queue health, not only HTTP liveness.
- Training and data-prep smoke checks are consolidated through the `training-smoke` Make target and the validated `backend/.venv` runtime.

## P0

- Most authenticated frontend API calls still default to `cache: "no-store"`. That is correct for private state, but read-heavy surfaces such as location search, public weather fallback data, and some assistant overview fragments still have room for short-lived caching or stale-while-revalidate behavior.
- Production readiness still depends on external services being available. The app now reports queue health correctly, but the first public release still relies on remote try-on infrastructure or fallback behavior instead of a self-hosted try-on serving stack.
- `frontend/app/page.tsx` remains the heaviest entry route at roughly `209 kB` first-load JS. The next safe win is to keep pulling homepage sections behind lighter suspense or progressive hydration boundaries.

## P1

- `frontend/lib/api.ts` is lighter than before, but the public API layer is still broad. The next safe split is by domain:
  `assistant`, `wardrobe`, `experience`, `auth`, and `try-on`.
- `backend/services/experience_service.py` now has real queue orchestration, but it is still a mixed-responsibility file. The clean next move is to split:
  `smart_wardrobe_state`, `smart_wardrobe_tasks`, `style_profile`, and `outfit_diary`.
- Smart wardrobe telemetry now exposes queue names and worker status, but it still lacks latency and retry metrics. Adding `queued_at`, `started_at`, and retry counters would make production debugging much easier.
- The backend and worker startup scripts now share a dependency stamp, but the frontend, mini-program, and mobile shells still use separate bootstrap habits. A single cross-surface bootstrap helper would reduce drift further.

## P2

- AAtrain packaging is much healthier with the existing bundle and packaging scripts, but the dataset lifecycle still wants a formal manifest:
  version, sample counts, SHA256, source lineage, and upload verification status.
- Model and large artifact storage can still be pushed further out of the main repo. Checkpoints, exports, and heavyweight vendor assets would benefit from stronger release-asset or object-storage boundaries.
- The mini-program and mobile shell now compile and point at the shared backend contract, but they still need deeper product-level smoke coverage beyond build/start validation.
- The Windows developer experience is improved, but more startup behavior could be centralized under one reusable bootstrap helper to reduce drift across `.cmd`, Docker, and Makefile entry points.
