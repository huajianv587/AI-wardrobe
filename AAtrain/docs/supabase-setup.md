# Supabase Setup

This project now treats Supabase Postgres as the primary product database. SQLite is only a local fallback for development.

## First Run

1. Copy `.env.example` to `.env`.
2. Fill the required environment variables listed below.
3. In Supabase SQL Editor, run `infra/supabase/productized_schema.sql`.
4. Start the backend again.

## Required Values

These are the values you must fill if you want the app to run with Supabase as the real database.

### 1. `DATABASE_URL`

Purpose:

- SQLAlchemy main database connection
- all users, wardrobe items, AI task states, auth session tokens, and experience states will be stored here

Format:

```env
DATABASE_URL=postgresql+psycopg://postgres:[YOUR_DB_PASSWORD]@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

Where to get it:

- Supabase Dashboard
- `Connect`
- `ORMs`
- copy the PostgreSQL connection string
- replace the password part with your real database password

### 2. `SUPABASE_URL`

Purpose:

- Supabase project API base URL
- used for auth/storage-related integration

Where to get it:

- Supabase Dashboard
- `Project Settings`
- `API`
- `Project URL`

### 3. `SUPABASE_ANON_KEY`

Purpose:

- public client key for frontend or public API access patterns

Where to get it:

- Supabase Dashboard
- `Project Settings`
- `API`
- `anon public`

### 4. `SUPABASE_SERVICE_ROLE_KEY`

Purpose:

- backend privileged operations
- storage sync and server-side Supabase actions

Where to get it:

- Supabase Dashboard
- `Project Settings`
- `API`
- `service_role`

Important:

- never expose this key to the browser
- only keep it in backend `.env` or server secrets

## Strongly Recommended Values

These are not required for the backend to boot, but they matter for real product behavior.

### 5. `BACKEND_PUBLIC_BASE_URL`

Purpose:

- password reset links
- public callback links
- any backend-generated absolute URLs

Examples:

```env
BACKEND_PUBLIC_BASE_URL=http://localhost:8000
BACKEND_PUBLIC_BASE_URL=https://api.yourdomain.com
```

### 6. `NEXT_PUBLIC_APP_URL`

Purpose:

- frontend public address
- useful for web links and future auth-related redirects

Examples:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 7. `BACKEND_CORS_ORIGINS`

Purpose:

- allow your frontend domain to call the backend

Examples:

```env
BACKEND_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
BACKEND_CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## AI / Model Related Values

Fill these only if you want the corresponding AI capability to be real instead of local fallback or placeholder logic.

### 8. Local -> OpenAI -> DeepSeek recognition chain

For the three-layer recognition pipeline:

- local model first
- retry once
- then OpenAI
- retry once
- then DeepSeek

You may fill:

```env
VLLM_BASE_URL=http://your-local-or-lan-vllm:8001/v1
QWEN_MODEL_NAME=Qwen2.5-7B-Instruct
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MULTIMODAL_MODEL=gpt-4.1-mini
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MULTIMODAL_MODEL=deepseek-chat
MULTIMODAL_REQUEST_TIMEOUT_SECONDS=20
```

If you do not fill `OPENAI_API_KEY` or `DEEPSEEK_API_KEY`, those layers will be skipped.

Recommended extra values for this chain:

- `OPENAI_MULTIMODAL_MODEL`
- `DEEPSEEK_MULTIMODAL_MODEL`
- `MULTIMODAL_REQUEST_TIMEOUT_SECONDS`

If your local first layer is a remote vLLM or OpenAI-compatible endpoint, `VLLM_BASE_URL` is the one that matters most.

### 9. Garment cleanup / cutout worker

If you want uploaded outfit photos to be sent to your real clothing cutout service:

```env
AI_CLEANUP_API_URL=
AI_CLEANUP_API_KEY=
AI_CLEANUP_TIMEOUT_SECONDS=45
```

If empty:

- the app still works
- it falls back to local white-background preview output

Important:

- if you want the real remote worker to run by default, set `MODEL_USE_LOCAL_IMAGE_CLEANUP=false`
- if `MODEL_USE_LOCAL_DEFAULT=true` and you do not override image cleanup, the system may stay on local fallback mode first
- if your worker is protected, also fill `AI_CLEANUP_API_KEY`

### 10. Optional remote AI workers

Fill only if you already deployed your own workers:

```env
LLM_RECOMMENDER_API_URL=
IMAGE_PROCESSOR_API_URL=
CLASSIFIER_API_URL=
MULTIMODAL_READER_API_URL=
VIRTUAL_TRYON_API_URL=
PRODUCT_RENDERER_API_URL=
AVATAR_BUILDER_API_URL=
```

## Email / Password Reset Values

If you want real password reset emails instead of local fallback links, fill:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=AI Wardrobe
SMTP_USE_TLS=true
SMTP_USE_SSL=false
```

Also make sure:

- `BACKEND_PUBLIC_BASE_URL` points to your real backend domain
- `LOCAL_PASSWORD_RESET_TTL_MINUTES` is set to your desired reset-link lifetime

Where to get them:

- your email service provider
- examples: Resend SMTP, SendGrid SMTP, Mailgun SMTP, enterprise mailbox SMTP

If empty:

- password reset can still use local fallback link behavior in development

## What Else Is Worth Filling

Besides the three groups you asked about, these are the next most useful additions:

- `AI_CLEANUP_API_KEY`
  if your cleanup worker requires authentication
- `OPENAI_MULTIMODAL_MODEL`
  if you want to control the exact OpenAI fallback model
- `DEEPSEEK_MULTIMODAL_MODEL`
  if you want to control the exact DeepSeek fallback model
- `LOCAL_PASSWORD_RESET_TTL_MINUTES`
  if you want a clear reset-link expiry policy
- `SUPABASE_STORAGE_BUCKET`
  if you decide not to use the default `wardrobe-assets`
- `R2_PUBLIC_BASE_URL` and related `R2_*`
  only if you later want an external CDN/object-storage path for public assets

## Values You Can Usually Keep As-Is

These normally do not need custom edits on day one:

```env
SUPABASE_STORAGE_BUCKET=wardrobe-assets
SUPABASE_SYNC_TABLE=clothing_items
MODEL_USE_LOCAL_DEFAULT=true
LOCAL_ACCESS_TOKEN_TTL_MINUTES=120
LOCAL_REFRESH_TOKEN_TTL_DAYS=30
LOCAL_PASSWORD_RESET_TTL_MINUTES=30
```

## WeChat Mini Program Values

Only fill these if you are actually enabling the mini program:

```env
WECHAT_MINIPROGRAM_APP_ID=
WECHAT_MINIPROGRAM_APP_SECRET=
WECHAT_MINIPROGRAM_LOGIN_ENABLED=false
WECHAT_MINIPROGRAM_REQUEST_DOMAIN=
WECHAT_MINIPROGRAM_UPLOAD_DOMAIN=
WECHAT_MINIPROGRAM_SOCKET_DOMAIN=
```

## Recommended Fill Order

If you want the shortest path to a working product database, fill in this order:

1. `DATABASE_URL`
2. `SUPABASE_URL`
3. `SUPABASE_ANON_KEY`
4. `SUPABASE_SERVICE_ROLE_KEY`
5. `BACKEND_PUBLIC_BASE_URL`
6. `NEXT_PUBLIC_APP_URL`
7. `BACKEND_CORS_ORIGINS`
8. run `infra/supabase/productized_schema.sql`
9. start backend + frontend

## AI Cleanup Service Contract

Set `AI_CLEANUP_API_URL` if you want the wardrobe processing flow to call a real cleanup model service.

Expected request:

- `POST` multipart form-data
- field name: `image`

Supported responses:

- raw image bytes with an `image/*` content type
- JSON with `image_base64` and optional `content_type`
- JSON with `image_url`

If `AI_CLEANUP_API_URL` is empty or the remote service fails, the backend falls back to the local placeholder pipeline and keeps the wardrobe flow available.
