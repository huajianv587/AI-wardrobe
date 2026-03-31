from datetime import datetime

from app.schemas.auth import AuthSessionResponse, UserSummary
from services import auth_service


def _user_summary() -> UserSummary:
    return UserSummary(
        id=1,
        supabase_user_id="supabase-user-test-001",
        email="tester@ai-wardrobe.dev",
        avatar_url=None,
        created_at=datetime.utcnow(),
    )


def test_login_endpoint(client, monkeypatch):
    def fake_login(db, email, password):
        assert email == "tester@ai-wardrobe.dev"
        assert password == "secret123"
        return AuthSessionResponse(
            access_token="access-token",
            refresh_token="refresh-token",
            expires_at=999999999,
            expires_in=3600,
            user=_user_summary(),
        )

    monkeypatch.setattr(auth_service, "sign_in_with_password", fake_login)

    response = client.post("/api/v1/auth/login", json={"email": "tester@ai-wardrobe.dev", "password": "secret123"})
    payload = response.json()

    assert response.status_code == 200
    assert payload["access_token"] == "access-token"
    assert payload["user"]["supabase_user_id"] == "supabase-user-test-001"


def test_sign_up_endpoint(client, monkeypatch):
    def fake_sign_up(db, email, password):
        assert email == "new@ai-wardrobe.dev"
        assert password == "secret123"
        return AuthSessionResponse(
            access_token=None,
            refresh_token=None,
            expires_at=None,
            expires_in=None,
            requires_email_confirmation=True,
            message="Confirm your email first.",
            user=UserSummary(
                id=2,
                supabase_user_id="supabase-user-test-002",
                email="new@ai-wardrobe.dev",
                avatar_url=None,
                created_at=datetime.utcnow(),
            ),
        )

    monkeypatch.setattr(auth_service, "sign_up_with_password", fake_sign_up)

    response = client.post("/api/v1/auth/sign-up", json={"email": "new@ai-wardrobe.dev", "password": "secret123"})
    payload = response.json()

    assert response.status_code == 200
    assert payload["requires_email_confirmation"] is True
    assert payload["user"]["email"] == "new@ai-wardrobe.dev"


def test_me_endpoint(client):
    response = client.get("/api/v1/auth/me")
    payload = response.json()

    assert response.status_code == 200
    assert payload["email"] == "tester@ai-wardrobe.dev"
    assert payload["supabase_user_id"] == "supabase-user-test-001"
