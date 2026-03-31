# Mini Program Scaffold

This folder now contains a lightweight Taro-oriented scaffold so the mini program can start from API contracts instead of a blank directory.

Suggested structure:

- `app.ts` / `app.config.ts`: application entry and page registration
- `types/api.ts`: shared response contracts from FastAPI
- `services/http.ts`: central request helper
- `services/account.ts`: account and bootstrap requests
- `services/wardrobe.ts`: mini-program wardrobe aggregation APIs
- `services/recommend.ts`: recommendation APIs
- `services/ai.ts`: AI demo APIs
- `pages/index`: mini program home payload from `/api/v1/mini-program/home`
- `pages/wardrobe`: lightweight wardrobe cards from `/api/v1/mini-program/wardrobe`
- `pages/recommend`: outfit recommendation preview from `/api/v1/outfits/recommend`
- `pages/try-on`: virtual try-on adapter preview from `/api/v1/ai-demo/run`
- `pages/account`: account / sync status shell from `/api/v1/mini-program/account`

Recommended backend aggregation endpoint:

- `/api/v1/mini-program/home`: already added for shortcut blocks and workflow previews
- `/api/v1/mini-program/wardrobe`: lightweight wardrobe cards
- `/api/v1/mini-program/account`: account + sync summary

Recommended next implementation order:

1. Replace the current local storage token reads with real mini program login + refresh flow
2. Add Taro request interceptors for `Authorization` and token refresh
3. Add image upload and garment creation flows
4. Add mini program specific navigation and pull-to-refresh UX
