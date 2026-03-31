# Deployment Checklist

## Web + Backend

1. Copy `.env.example` to `.env`
2. Fill `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
3. Execute `infra/supabase/schema.sql`
4. Fill any external AI worker URLs you already have
5. Decide whether each feature should prefer a local model or an external worker
6. Confirm `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_URL`, and `BACKEND_PUBLIC_BASE_URL`

## WeChat Mini Program

1. Fill `WECHAT_MINIPROGRAM_APP_ID`
2. Fill `WECHAT_MINIPROGRAM_APP_SECRET`
3. Set `WECHAT_MINIPROGRAM_LOGIN_ENABLED=true` when ready to use real WeChat login
4. Keep `WECHAT_MINIPROGRAM_TEST_MODE=true` while testing email login in parallel
5. Fill `WECHAT_MINIPROGRAM_REQUEST_DOMAIN`, `WECHAT_MINIPROGRAM_UPLOAD_DOMAIN`, and `WECHAT_MINIPROGRAM_SOCKET_DOMAIN`
6. Replace `miniprogram/project.config.json` `appid` with the real app id
7. Configure the same legal domains in the WeChat mini program admin console
8. Ensure your backend is reachable through HTTPS before production submission

## Native App Placeholders

These fields are now reserved in `.env.example` for later:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PROJECT_ID`
- `IOS_BUNDLE_ID`
- `ANDROID_PACKAGE_NAME`
- `APP_STORE_DISPLAY_NAME`

## Model Control

Two layers now exist:

1. `.env` worker URLs and model-use flags
2. `backend/core/local_model.py` hard switches for quick local-vs-remote control during development
