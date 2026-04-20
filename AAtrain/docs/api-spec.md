# API Spec

## Base

- Base path: `/api/v1`

## Health

- `GET /health`

## Auth

- `POST /auth/sign-up`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Wardrobe

- `GET /wardrobe/items`
- `GET /wardrobe/items/{item_id}`
- `POST /wardrobe/items`
- `PUT /wardrobe/items/{item_id}`
- `DELETE /wardrobe/items/{item_id}`
- `POST /wardrobe/items/{item_id}/upload-image`
- `POST /wardrobe/items/{item_id}/process-image`
- `POST /wardrobe/items/{item_id}/process-image-async`
- `POST /wardrobe/items/{item_id}/auto-enrich`

## Recommendation

- `POST /outfits/recommend`

## Assistant

- `GET /assistant/overview`
- `GET /assistant/location-search?q=...`
- `POST /assistant/tomorrow`
- `POST /assistant/quick-mode`
- `GET /assistant/gaps`
- `GET /assistant/reminders`
- `GET /assistant/style-profile`
- `PUT /assistant/style-profile`
- `GET /assistant/items/{item_id}/memory-card`
- `PUT /assistant/items/{item_id}/memory-card`
- `POST /assistant/feedback`
- `GET /assistant/outfits`
- `POST /assistant/outfits`
- `GET /assistant/wear-log`
- `POST /assistant/wear-log`
- `POST /assistant/packing`
- `GET /assistant/tasks/{task_id}`

## Sync

- `GET /sync/status`
- `POST /sync/wardrobe`

## AI Demo

- `GET /ai-demo/workflows`
- `GET /ai-demo/status`
- `POST /ai-demo/run`

## Mobile / Client Aggregation

- `GET /client/bootstrap`
- `GET /client/wardrobe`
- `GET /client/account`
- `GET /client/ai/workflows`
- `GET /client/assistant/overview`
- `GET /client/assistant/reminders`
- `POST /client/assistant/quick-mode`
- `POST /client/assistant/tomorrow`
- `POST /client/assistant/packing`

## Mini Program Compatibility

- `GET /mini-program/home`
- `GET /mini-program/wardrobe`
- `GET /mini-program/account`
