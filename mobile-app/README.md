# AI Wardrobe Mobile

Expo React Native client for App Store and TestFlight distribution.

## What is implemented

- Expo Router native navigation with Home, Wardrobe, Assistant, Insights, and Account tabs.
- Secure token storage through `expo-secure-store`.
- Native image selection through `expo-image-picker`.
- Shared FastAPI contracts:
  - `/api/v1/auth/*`
  - `/api/v1/client/*`
  - `/api/v1/wardrobe/*`
  - `/api/v1/assistant/*`
  - `/api/v1/experience/*`
  - `/api/v1/try-on/render`
- App Store-required account deletion entry in the Account tab.
- Access-token refresh retry on authenticated 401 responses.
- Upload size/type validation and visible async processing states.
- Wardrobe search, filters, edit, delete, retry processing, and empty/error states.
- Assistant quick recommendations, tomorrow planning, packing, save outfit, and feedback flows.
- EAS build and submit profiles for iOS.

## Local commands

```bash
npm install
npm run smoke
npm run typecheck
npm run doctor
npm run release:check
npm run start
```

Set the backend URL before running against production or a LAN backend:

```bash
$env:EXPO_PUBLIC_API_BASE_URL="https://api.aiwardrobes.com"
npm run start
```

## iOS release commands

```bash
npm run build:ios:preview
npm run build:ios:production
npm run submit:ios
```

Before submitting, create the Apple Developer account, create the App Store Connect app, and fill the EAS submit credentials in the EAS prompt or CI secrets.

## Release materials

The App Store Connect drafts and operational checklists live in `mobile-app/store`:

- `app-store-connect.en-US.md`
- `app-store-connect.zh-Hans.md`
- `privacy-labels.md`
- `testflight-eas-checklist.md`
- `production-api-runbook.md`
- `release-env.example`

## App Store defaults

- App name: `AI Wardrobe`
- Bundle ID: `com.aiwardrobes.app`
- Version: `1.0.0`
- Default API: `https://api.aiwardrobes.com`
- First release: free app, no ads, no in-app purchases, no cross-app tracking
