from datetime import datetime
from urllib.parse import parse_qs, urlparse

from sqlalchemy import select

from app.models.auth_session import AuthSessionToken
from app.models.user import User
from app.schemas.auth import AuthSessionResponse, UserSummary
from services import auth_service, email_service


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
    def fake_sign_up(db, email, password, *, display_name=None, redirect_to=None):
        assert email == "new@ai-wardrobe.dev"
        assert password == "secret123"
        assert display_name is None
        assert redirect_to == "https://www.aiwardrobes.com/login"
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

    response = client.post(
        "/api/v1/auth/sign-up",
        json={
            "email": "new@ai-wardrobe.dev",
            "password": "secret123",
            "redirect_to": "https://www.aiwardrobes.com/login",
        },
    )
    payload = response.json()

    assert response.status_code == 200
    assert payload["requires_email_confirmation"] is True
    assert payload["user"]["email"] == "new@ai-wardrobe.dev"


def test_local_email_sign_up_and_login_flow(client):
    sign_up_response = client.post(
        "/api/v1/auth/sign-up",
        json={
            "email": "local-user@ai-wardrobe.dev",
            "password": "secret123",
            "display_name": "本地测试用户",
        },
    )
    sign_up_payload = sign_up_response.json()

    assert sign_up_response.status_code == 200
    assert sign_up_payload["access_token"]
    assert sign_up_payload["refresh_token"]
    assert sign_up_payload["user"]["email"] == "local-user@ai-wardrobe.dev"
    assert sign_up_payload["user"]["display_name"] == "本地测试用户"
    assert sign_up_payload["user"]["auth_provider"] == "local"

    with client.testing_session_local() as db:
        user = db.scalar(select(User).where(User.email == "local-user@ai-wardrobe.dev"))
        assert user is not None
        assert user.password_hash != "secret123"
        assert user.password_hash.startswith("pbkdf2_sha256$")

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "LOCAL-USER@AI-WARDROBE.DEV", "password": "secret123"},
    )
    login_payload = login_response.json()

    assert login_response.status_code == 200
    assert login_payload["access_token"]
    assert login_payload["user"]["email"] == "local-user@ai-wardrobe.dev"
    assert login_payload["user"]["auth_provider"] == "local"


def test_local_email_sign_up_rejects_duplicate_email(client):
    first_response = client.post(
        "/api/v1/auth/sign-up",
        json={"email": "duplicate@ai-wardrobe.dev", "password": "secret123"},
    )
    assert first_response.status_code == 200

    duplicate_response = client.post(
        "/api/v1/auth/sign-up",
        json={"email": "Duplicate@ai-wardrobe.dev", "password": "secret123"},
    )
    duplicate_payload = duplicate_response.json()

    assert duplicate_response.status_code == 409
    assert duplicate_payload["detail"] == "这个邮箱已经注册过了，请直接登录。"


def test_password_reset_endpoint(client, monkeypatch):
    def fake_reset(db, email, redirect_to=None):
        assert email == "tester@ai-wardrobe.dev"
        assert redirect_to == "http://localhost:3000/reset-password"
        return {
            "status": "queued",
            "message": "Password reset prepared.",
            "action_url": None,
            "action_label": None,
        }

    monkeypatch.setattr(auth_service, "send_password_reset_email", fake_reset)

    response = client.post(
        "/api/v1/auth/password-reset",
        json={"email": "tester@ai-wardrobe.dev", "redirect_to": "http://localhost:3000/reset-password"},
    )
    payload = response.json()

    assert response.status_code == 200
    assert payload["status"] == "queued"
    assert payload["message"] == "Password reset prepared."


def test_local_password_reset_preview_and_confirm_flow(client, monkeypatch):
    monkeypatch.setattr(email_service, "is_enabled", lambda: False)

    sign_up_response = client.post(
        "/api/v1/auth/sign-up",
        json={"email": "recover@ai-wardrobe.dev", "password": "old-secret-123"},
    )
    sign_up_payload = sign_up_response.json()

    assert sign_up_response.status_code == 200
    assert sign_up_payload["access_token"]

    reset_response = client.post(
        "/api/v1/auth/password-reset",
        json={"email": "recover@ai-wardrobe.dev", "redirect_to": "http://localhost:3000/reset-password"},
    )
    reset_payload = reset_response.json()

    assert reset_response.status_code == 200
    assert reset_payload["status"] == "preview"
    assert reset_payload["action_url"]

    token = parse_qs(urlparse(reset_payload["action_url"]).query)["token"][0]

    confirm_response = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "new_password": "new-secret-456"},
    )
    confirm_payload = confirm_response.json()

    assert confirm_response.status_code == 200
    assert confirm_payload["status"] == "updated"

    with client.testing_session_local() as db:
        user = db.scalar(select(User).where(User.email == "recover@ai-wardrobe.dev"))
        assert user is not None
        assert user.password_hash.startswith("pbkdf2_sha256$")
        sessions = list(db.scalars(select(AuthSessionToken).where(AuthSessionToken.user_id == user.id)).all())
        assert sessions
        assert all(session.revoked_at is not None for session in sessions)

    stale_login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "recover@ai-wardrobe.dev", "password": "old-secret-123"},
    )
    assert stale_login_response.status_code == 401

    fresh_login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "recover@ai-wardrobe.dev", "password": "new-secret-456"},
    )
    fresh_login_payload = fresh_login_response.json()

    assert fresh_login_response.status_code == 200
    assert fresh_login_payload["access_token"]

    reused_token_response = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "new_password": "another-secret-789"},
    )

    assert reused_token_response.status_code == 400


def test_me_endpoint(client):
    response = client.get("/api/v1/auth/me")
    payload = response.json()

    assert response.status_code == 200
    assert payload["email"] == "tester@ai-wardrobe.dev"
    assert payload["supabase_user_id"] == "supabase-user-test-001"


def test_refresh_endpoint(client, monkeypatch):
    def fake_refresh(db, refresh_token, *, access_token=None):
        assert refresh_token == "refresh-token"
        assert access_token == "access-token"
        return AuthSessionResponse(
            access_token="new-access-token",
            refresh_token="new-refresh-token",
            expires_at=1999999999,
            expires_in=3600,
            message="Session refreshed successfully.",
            user=_user_summary(),
        )

    monkeypatch.setattr(auth_service, "refresh_session", fake_refresh)

    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "refresh-token", "access_token": "access-token"},
    )
    payload = response.json()

    assert response.status_code == 200
    assert payload["access_token"] == "new-access-token"
    assert payload["refresh_token"] == "new-refresh-token"


def test_logout_endpoint(client, monkeypatch):
    requests = []

    def fake_logout(access_token, refresh_token=None):
        requests.append({"access_token": access_token, "refresh_token": refresh_token})

    monkeypatch.setattr(auth_service, "sign_out_session", fake_logout)

    response = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": "Bearer active-token"},
        json={"refresh_token": "refresh-token"},
    )
    payload = response.json()

    assert response.status_code == 200
    assert payload["status"] == "signed_out"
    assert requests == [{"access_token": "active-token", "refresh_token": "refresh-token"}]


def test_mini_program_auth_options_endpoint(client, monkeypatch):
    monkeypatch.setattr(
        auth_service,
        "get_mini_program_auth_options",
        lambda: {
            "wechat_login_enabled": True,
            "wechat_test_mode": True,
            "email_test_login_enabled": True,
            "wechat_app_id": "wx123",
            "request_domain": "https://api.example.com",
            "upload_domain": "https://upload.example.com",
            "socket_domain": "wss://socket.example.com",
        },
    )

    response = client.get("/api/v1/auth/mini-program/options")
    payload = response.json()

    assert response.status_code == 200
    assert payload["wechat_login_enabled"] is True
    assert payload["wechat_app_id"] == "wx123"


def test_mini_program_wechat_login_endpoint(client, monkeypatch):
    def fake_wechat_login(db, **kwargs):
        assert kwargs["code"] == "wechat-code"
        assert kwargs["display_name"] == "Mini User"
        assert kwargs["device_label"] == "wechat-mini-program"
        return AuthSessionResponse(
            access_token="local-access-token",
            refresh_token="local-refresh-token",
            expires_at=2999999999,
            expires_in=7200,
            message="WeChat mini program session established successfully.",
            user=UserSummary(
                id=3,
                email="wx_openid@mini.ai-wardrobe.dev",
                display_name="Mini User",
                auth_provider="wechat-mini",
                avatar_url=None,
                created_at=datetime.utcnow(),
            ),
        )

    monkeypatch.setattr(auth_service, "sign_in_with_wechat_code", fake_wechat_login)

    response = client.post(
        "/api/v1/auth/mini-program/login/wechat",
        json={"code": "wechat-code", "display_name": "Mini User", "device_label": "wechat-mini-program"},
    )
    payload = response.json()

    assert response.status_code == 200
    assert payload["access_token"] == "local-access-token"
    assert payload["user"]["auth_provider"] == "wechat-mini"
