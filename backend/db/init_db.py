from pathlib import Path
from sqlalchemy import inspect, text
from db.base import Base
from db.session import SessionLocal, engine
from app.models import Avatar3D, Category, ClothingItem, Outfit, OutfitRecommendation, Tag, User
from services.wardrobe_service import seed_demo_data


def _ensure_auth_columns() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("users")}

    with engine.begin() as connection:
        if "supabase_user_id" not in columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN supabase_user_id VARCHAR(255)"))

        connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_supabase_user_id ON users (supabase_user_id)"))


def _ensure_wardrobe_columns() -> None:
    inspector = inspect(engine)
    if "clothing_items" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("clothing_items")}

    with engine.begin() as connection:
        if "last_synced_at" not in columns:
            connection.execute(text("ALTER TABLE clothing_items ADD COLUMN last_synced_at DATETIME"))


def init_db() -> None:
    Path("./data").mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    _ensure_auth_columns()
    _ensure_wardrobe_columns()

    with SessionLocal() as db:
        seed_demo_data(db)
