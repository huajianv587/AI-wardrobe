import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.deps import get_db
from app.main import app
from core.config import settings
from db.base import Base
from services import supabase_service
from services.wardrobe_service import seed_demo_data


@pytest.fixture()
def client(tmp_path):
    db_path = tmp_path / "test_ai_wardrobe.db"
    asset_root = tmp_path / "assets"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False}, future=True)
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    original_storage_root = settings.local_storage_root
    original_supabase_url = settings.supabase_url
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_ai_cleanup_api_url = settings.ai_cleanup_api_url
    original_ai_cleanup_api_key = settings.ai_cleanup_api_key
    settings.local_storage_root = str(asset_root)
    settings.supabase_url = ""
    settings.supabase_service_role_key = ""
    settings.ai_cleanup_api_url = ""
    settings.ai_cleanup_api_key = ""
    supabase_service.get_client.cache_clear()
    supabase_service._bucket_ready = False

    Base.metadata.create_all(bind=engine)

    with testing_session_local() as db:
        seed_demo_data(db)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    settings.local_storage_root = original_storage_root
    settings.supabase_url = original_supabase_url
    settings.supabase_service_role_key = original_supabase_service_role_key
    settings.ai_cleanup_api_url = original_ai_cleanup_api_url
    settings.ai_cleanup_api_key = original_ai_cleanup_api_key
    supabase_service.get_client.cache_clear()
    supabase_service._bucket_ready = False
    Base.metadata.drop_all(bind=engine)
