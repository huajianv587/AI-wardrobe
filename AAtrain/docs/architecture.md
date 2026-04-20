# AI Wardrobe Architecture

## Layered Design

The system uses a frontend-backend split with AI microservices:

1. Frontend layer: Next.js web app and future Taro mini program
2. API gateway layer: FastAPI APIs behind nginx
3. Business layer: auth, wardrobe, outfit, sync, and profile services
4. AI layer: image cleanup, try-on generation, classifier, avatar builder, and LLM recommendation
5. Data layer: SQLite local-first storage, optional Supabase sync, and object storage

## MVP 2.5D Strategy

To reduce technical complexity while keeping the experience useful, the MVP uses a 2.5D approach:

- use 2D virtual try-on generation for photoreal try-on outputs
- use a lightweight rotatable avatar stage in the frontend
- avoid full physical cloth simulation in Phase 1