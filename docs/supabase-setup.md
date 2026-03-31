# Supabase Setup

1. Copy `.env.example` to `.env`.
2. Fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. In the Supabase SQL editor, run `infra/supabase/schema.sql`.
4. Start the backend again. The app will keep SQLite as the local source of truth and sync clothing item metadata to Supabase when configured.
5. The backend will also try to create the `SUPABASE_STORAGE_BUCKET` bucket automatically and upload source/processed images there as cloud backups.

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
