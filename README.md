# AI Wardrobe

AI Wardrobe is a monorepo for a personal styling platform that combines:

- digital wardrobe management
- 2.5D avatar-based virtual try-on
- AI outfit recommendation
- private account-based wardrobe data with Supabase-backed persistence

## Product Vision

Modern users often own many clothes but still feel they have nothing to wear. AI Wardrobe focuses on helping users remember what they have, preview outfits faster, and receive styling suggestions that match real scenes such as commuting, dating, travel, and weather changes.

## Chosen Stack

### Frontend

- Next.js App Router
- Tailwind CSS
- React Three Fiber / Three.js
- Framer Motion
- Zustand

### Backend

- FastAPI
- SQLAlchemy
- Supabase Postgres as the primary product database
- SQLite as a local development fallback only
- Supabase Auth and Storage integration
- Redis for cache/session extension
- MinIO or Supabase Storage for assets

### AI Layer

- Qwen2.5-7B LoRA for outfit recommendation
- Qwen-VL / LLaVA for multimodal understanding
- BiRefNet / RMBG-2.0 for background removal
- CLIP for classification and tagging
- OOTDiffusion for 2.5D try-on effect generation

## Repository Layout

- `frontend/`: Web app and design system
- `backend/`: FastAPI API service
- `ai-services/`: image, try-on, classifier, and recommender microservices
- `training/`: training scripts and configs
- `model_training/`: your checkpoints, datasets, and export artifacts
- `miniprogram/`: WeChat Mini Program placeholder
- `infra/`: Docker, nginx, and environment config
- `docs/`: architecture and API documentation

## MVP Phase 1

1. User login and private wardrobe space
2. Add clothing with AI background cleanup flow
3. Wardrobe browse, search, and filtering
4. AI outfit recommendation with "change another look"
5. Supabase-backed persistence with per-account data isolation
6. Polished web UI for dashboard, wardrobe, recommendation, and try-on

## Current Status

This step scaffolds:

- a runnable Next.js frontend foundation
- a FastAPI backend foundation
- Supabase-ready SQLAlchemy models
- re-runnable Supabase SQL schema for product tables, auth/session tables, AI task tables, and experience state tables
- local recommendation heuristics that can later be replaced by your trained checkpoints
- Docker and environment placeholders

## Local Run

1. Copy `.env.example` to `.env`.
2. Fill `DATABASE_URL` with your Supabase Postgres connection string:

```bash
postgresql+psycopg://postgres:[YOUR_DB_PASSWORD]@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

3. Fill `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
4. Run [`infra/supabase/productized_schema.sql`](infra/supabase/productized_schema.sql) inside the Supabase SQL Editor.
5. If you have a real image cleanup service, set `AI_CLEANUP_API_URL`. If not, the app now prefers the local segmentation stack (`SAM2 + SCHP + YOLO + FashionCLIP`) and only falls back to a simple white-background preview when the local weights are missing.
6. Start the backend and frontend:

```bash
cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app --reload
cd frontend && npm run dev
```

## Model Bootstrap

Before first real AI use, install the optional model dependencies and download the local assets:

```bash
pip install -r backend/requirements-fashion.txt
python backend/scripts/download_fashion_models.py
```

For virtual try-on, the web app and mini program now call `/api/v1/try-on/render`. The backend can:

- render a local try-on composite immediately
- proxy to your remote try-on worker through `VIRTUAL_TRYON_API_URL`
- fall back to the local composite if the remote worker is unavailable

To stage a base try-on model snapshot locally:

```bash
pip install -r backend/requirements-tryon.txt
python backend/scripts/download_virtual_tryon_models.py
```

When you are ready to use your own 5090 fine-tuned checkpoints, place them under `model_training/checkpoints/virtual-tryon/` or deploy your own worker and fill `VIRTUAL_TRYON_API_URL`.

## Supabase Product Schema

Use [`infra/supabase/productized_schema.sql`](infra/supabase/productized_schema.sql) as the only SQL Editor script. It is written to be re-runnable and aligned with the current backend models.

It covers:

- `users`, `auth_session_tokens`, `password_reset_tokens`
- `clothing_items`, `categories`, `tags`, `outfits`, `wear_logs`
- `assistant_tasks`, `style_profiles`, `recommendation_signals`
- `experience_user_states` for the previously local experience-page state
- `storage.buckets` initialization for `wardrobe-assets`

Important:

- The script uses `auth.users.raw_user_meta_data`, not `app_metadata`.
- API keys should stay in `.env` or Supabase project secrets, not in public tables.
- Demo wardrobe seed data now runs only when `DATABASE_URL` points to SQLite.

## Storage Flow

- When `DATABASE_URL` points to Supabase Postgres, Supabase becomes the source of truth for users, clothing items, AI task states, wear logs, and experience states.
- Uploaded source images and processed images can be backed up to Supabase Storage through the `wardrobe-assets` bucket.
- SQLite is now only a local fallback mode for development or offline experiments.
- If the external AI cleanup service is configured, the process endpoint calls it directly; otherwise the flow falls back to a local placeholder result so the wardrobe UI stays usable.
