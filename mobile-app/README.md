# Future Native App Notes

This folder now contains a lightweight Expo shell so the native client no longer starts from an empty placeholder.

Current scaffold:

- [App.tsx](/e:/项目夹/AI_WEARDROB/mobile-app/App.tsx)
- [package.json](/e:/项目夹/AI_WEARDROB/mobile-app/package.json)

Recommended direction:

- Framework: Expo React Native
- Auth: reuse the same Supabase token flow
- Data: reuse the same owner-scoped FastAPI contracts
- Aggregation: prefer `/api/v1/client/*` and `/api/v1/client/assistant/*`
- First native screens: assistant overview, wardrobe cards, quick mode, account session

That means the native app can be added later without changing the backend ownership model or the AI worker adapter routes.
