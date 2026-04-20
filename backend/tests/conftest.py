import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.api.deps import get_current_user, get_db, get_optional_user
from app.middleware import reset_rate_limit_store
from app.main import app
from app.models.user import User
from core.config import settings
from db.base import Base
from services import auth_service, experience_service, r2_storage_service, supabase_service, task_queue_service
from services.wardrobe_service import seed_demo_data


@pytest.fixture()
def client(tmp_path):
    reset_rate_limit_store()
    db_path = tmp_path / "test_ai_wardrobe.db"
    asset_root = tmp_path / "assets"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False}, future=True)
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    original_storage_root = settings.local_storage_root
    original_redis_url = settings.redis_url
    original_supabase_url = settings.supabase_url
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_ai_cleanup_api_url = settings.ai_cleanup_api_url
    original_ai_cleanup_api_key = settings.ai_cleanup_api_key
    original_llm_recommender_api_url = settings.llm_recommender_api_url
    original_image_processor_api_url = settings.image_processor_api_url
    original_classifier_api_url = settings.classifier_api_url
    original_multimodal_reader_api_url = settings.multimodal_reader_api_url
    original_virtual_tryon_api_url = settings.virtual_tryon_api_url
    original_product_renderer_api_url = settings.product_renderer_api_url
    original_avatar_builder_api_url = settings.avatar_builder_api_url
    original_r2_account_id = settings.r2_account_id
    original_r2_bucket = settings.r2_bucket
    original_r2_access_key_id = settings.r2_access_key_id
    original_r2_secret_access_key = settings.r2_secret_access_key
    original_r2_endpoint_url = settings.r2_endpoint_url
    original_r2_public_base_url = settings.r2_public_base_url
    original_task_queue_enabled = settings.task_queue_enabled
    original_task_queue_eager = settings.task_queue_eager
    original_state_path = experience_service._state_path
    original_experience_session_local = experience_service.SessionLocal
    settings.local_storage_root = str(asset_root)
    settings.redis_url = ""
    settings.supabase_url = ""
    settings.supabase_service_role_key = ""
    settings.ai_cleanup_api_url = ""
    settings.ai_cleanup_api_key = ""
    settings.llm_recommender_api_url = ""
    settings.image_processor_api_url = ""
    settings.classifier_api_url = ""
    settings.multimodal_reader_api_url = ""
    settings.virtual_tryon_api_url = ""
    settings.product_renderer_api_url = ""
    settings.avatar_builder_api_url = ""
    settings.r2_account_id = ""
    settings.r2_bucket = ""
    settings.r2_access_key_id = ""
    settings.r2_secret_access_key = ""
    settings.r2_endpoint_url = ""
    settings.r2_public_base_url = ""
    settings.task_queue_enabled = True
    settings.task_queue_eager = True
    task_queue_service.reset_queue_clients()
    experience_state_path = tmp_path / "experience_state.json"
    asset_root.mkdir(parents=True, exist_ok=True)
    experience_service._state_path = lambda: experience_state_path
    experience_service.SessionLocal = testing_session_local
    supabase_service.get_client.cache_clear()
    supabase_service._bucket_ready = False
    r2_storage_service.get_client.cache_clear()

    Base.metadata.create_all(bind=engine)

    with testing_session_local() as db:
        local_user = User(
            email="tester@ai-wardrobe.dev",
            supabase_user_id="supabase-user-test-001",
            password_hash="supabase-managed",
        )
        db.add(local_user)
        seed_demo_data(db)
        db.commit()

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    def override_get_current_user(request: Request):
        authorization = request.headers.get("authorization", "")
        if authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1].strip()
            db = testing_session_local()
            try:
                return auth_service.get_current_user_from_token(db, token)
            finally:
                db.close()

        db = testing_session_local()
        try:
            user = db.scalar(select(User).where(User.email == "tester@ai-wardrobe.dev"))
            assert user is not None
            return user
        finally:
            db.close()

    def override_get_optional_user(request: Request):
        authorization = request.headers.get("authorization", "")
        if authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1].strip()
            db = testing_session_local()
            try:
                return auth_service.get_current_user_from_token(db, token)
            finally:
                db.close()

        if request.url.path.startswith("/api/v1/assets") and request.query_params.get("access_token"):
            return None

        db = testing_session_local()
        try:
            user = db.scalar(select(User).where(User.email == "tester@ai-wardrobe.dev"))
            assert user is not None
            return user
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_optional_user] = override_get_optional_user

    with TestClient(app) as test_client:
        test_client.testing_session_local = testing_session_local
        yield test_client

    app.dependency_overrides.clear()
    reset_rate_limit_store()
    settings.local_storage_root = original_storage_root
    settings.redis_url = original_redis_url
    settings.supabase_url = original_supabase_url
    settings.supabase_service_role_key = original_supabase_service_role_key
    settings.ai_cleanup_api_url = original_ai_cleanup_api_url
    settings.ai_cleanup_api_key = original_ai_cleanup_api_key
    settings.llm_recommender_api_url = original_llm_recommender_api_url
    settings.image_processor_api_url = original_image_processor_api_url
    settings.classifier_api_url = original_classifier_api_url
    settings.multimodal_reader_api_url = original_multimodal_reader_api_url
    settings.virtual_tryon_api_url = original_virtual_tryon_api_url
    settings.product_renderer_api_url = original_product_renderer_api_url
    settings.avatar_builder_api_url = original_avatar_builder_api_url
    settings.r2_account_id = original_r2_account_id
    settings.r2_bucket = original_r2_bucket
    settings.r2_access_key_id = original_r2_access_key_id
    settings.r2_secret_access_key = original_r2_secret_access_key
    settings.r2_endpoint_url = original_r2_endpoint_url
    settings.r2_public_base_url = original_r2_public_base_url
    settings.task_queue_enabled = original_task_queue_enabled
    settings.task_queue_eager = original_task_queue_eager
    task_queue_service.reset_queue_clients()
    experience_service._state_path = original_state_path
    experience_service.SessionLocal = original_experience_session_local
    supabase_service.get_client.cache_clear()
    supabase_service._bucket_ready = False
    r2_storage_service.get_client.cache_clear()
    Base.metadata.drop_all(bind=engine)
