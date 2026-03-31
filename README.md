# AI Wardrobe

AI Wardrobe is a monorepo for a personal styling platform that combines:

- digital wardrobe management
- 2.5D avatar-based virtual try-on
- AI outfit recommendation
- local-first data storage with optional cloud sync

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
- SQLAlchemy + SQLite
- Supabase for cloud sync and auth integration
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
5. Local-first SQLite persistence with optional Supabase sync
6. Polished web UI for dashboard, wardrobe, recommendation, and try-on

## Current Status

This step scaffolds:

- a runnable Next.js frontend foundation
- a FastAPI backend foundation
- SQLite models and demo data
- local recommendation heuristics that can later be replaced by your trained checkpoints
- Docker and environment placeholders

## Local Run

1. Copy `.env.example` to `.env`.
2. If you want cloud backup, fill in the Supabase keys and run `infra/supabase/schema.sql` inside the Supabase SQL editor.
3. If you have a real image cleanup service, set `AI_CLEANUP_API_URL`. If not, the app will use the local placeholder cleanup path.
4. Start the backend and frontend:

```bash
cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app --reload
cd frontend && npm run dev
```

## Storage Flow

- SQLite remains the local source of truth for MVP work.
- Uploaded source images and processed images are always stored locally first.
- When Supabase is configured, the backend also backs those assets up to Supabase Storage and mirrors clothing item metadata into the `clothing_items` table.
- If the external AI cleanup service is configured, the process endpoint calls it directly; otherwise the flow falls back to a local placeholder result so the wardrobe UI stays usable.
