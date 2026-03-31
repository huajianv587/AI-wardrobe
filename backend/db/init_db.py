from pathlib import Path
from db.base import Base
from db.session import SessionLocal, engine
from app.models import Avatar3D, Category, ClothingItem, Outfit, OutfitRecommendation, Tag, User
from services.wardrobe_service import seed_demo_data


def init_db() -> None:
    Path("./data").mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        seed_demo_data(db)