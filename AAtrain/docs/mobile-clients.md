# Mobile Client Interface Overview

The backend now exposes a platform-neutral mobile client surface in addition to the web APIs.

## Why this matters

Future clients do not have to talk directly to many separate endpoints just to render a usable home screen. This is useful for:

- WeChat mini program
- iOS app distributed through the App Store
- Android APK / direct-download app

## Client-facing endpoints

- `GET /api/v1/client/bootstrap`
- `GET /api/v1/client/wardrobe`
- `GET /api/v1/client/account`
- `GET /api/v1/client/ai/workflows`

These endpoints are authenticated and already reuse the same owner-scoped wardrobe, sync, and AI workflow data as the web app.

## Recommended app path

For future native apps, keep the API layer shared and build a separate client shell:

- Web: Next.js
- Mini program: Taro
- Native app: Expo React Native or another React Native shell

The important part is that all three clients can now share:

- Supabase Auth token flow
- owner-scoped wardrobe CRUD
- AI demo / worker adapter contracts
- sync status summaries

This keeps the product architecture consistent while still allowing each client to have a platform-specific UI.
