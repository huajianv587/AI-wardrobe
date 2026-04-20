# Mobile App Shell

This folder contains the lightweight Expo shell for the future iOS and Android client.

Current scaffold:

- [App.tsx](/E:/项目夹/AI-wardrobe-clean-0418/mobile-app/App.tsx)
- [package.json](/E:/项目夹/AI-wardrobe-clean-0418/mobile-app/package.json)

Runtime contract:

- set `EXPO_PUBLIC_API_BASE_URL` to the same backend origin used by web and mini-program
- keep the mobile shell behind the same `/api/v1/*` backend contract
- let the backend keep routing recommendations, multimodal parsing, Redis task polling, and hybrid try-on upstreams

Useful commands:

```bash
npm install
npm run start
npm run smoke
```

Recommended direction:

- Framework: Expo React Native
- Auth: reuse the same Supabase token flow
- Data: reuse the same owner-scoped FastAPI contracts
- Aggregation: prefer `/api/v1/client/*` and `/api/v1/client/assistant/*`
- First native screens: assistant overview, wardrobe cards, quick mode, account session
