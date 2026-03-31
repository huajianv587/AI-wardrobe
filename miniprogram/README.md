# Mini Program Scaffold

This folder now contains a lightweight Taro-oriented scaffold so the mini program can start from API contracts instead of a blank directory.

It now also includes:

- `package.json`: build scripts for WeChat mini program output
- `config/index.ts`: Taro compile config
- `src/`: official Taro source root wrappers
- `project.config.json`: WeChat DevTools project config

Suggested structure:

- `app.ts` / `app.config.ts`: application entry and page registration
- `types/api.ts`: shared response contracts from FastAPI
- `services/http.ts`: central request helper
- `services/account.ts`: account and bootstrap requests
- `services/wardrobe.ts`: mini-program wardrobe aggregation APIs
- `services/recommend.ts`: recommendation APIs
- `services/ai.ts`: AI demo APIs
- `pages/index`: mini program home payload from `/api/v1/client/bootstrap`
- `pages/wardrobe`: lightweight wardrobe cards from `/api/v1/client/wardrobe`
- `pages/recommend`: outfit recommendation preview from `/api/v1/outfits/recommend`
- `pages/try-on`: virtual try-on adapter preview from `/api/v1/ai-demo/run`
- `pages/account`: account / sync status shell from `/api/v1/client/account`

Recommended backend aggregation endpoint:

- `/api/v1/client/bootstrap`: shared mobile bootstrap payload
- `/api/v1/client/wardrobe`: shared mobile wardrobe payload
- `/api/v1/client/account`: shared mobile account payload
- `/api/v1/client/ai/workflows`: shared mobile AI workflow list

Recommended next implementation order:

1. Fill `WECHAT_MINIPROGRAM_APP_ID` / `WECHAT_MINIPROGRAM_APP_SECRET` in the backend `.env`
2. Replace `project.config.json` `appid` with the real mini program app id
3. Configure legal request / upload / websocket domains in WeChat admin and mirror them in `.env`
4. Use the built-in account page to test either WeChat login or email-based test login
5. Add image upload and garment creation flows
6. Open the project in WeChat DevTools using `dist/` after running `npm run build:weapp`
