# Future Native App Notes

This folder is reserved for a future iOS / Android shell.

Recommended direction:

- Framework: Expo React Native
- Auth: reuse the same Supabase token flow
- Data: reuse the same owner-scoped FastAPI contracts
- Aggregation: prefer `/api/v1/client/*` for mobile-first home, wardrobe, and account payloads

That means the native app can be added later without changing the backend ownership model or the AI worker adapter routes.
