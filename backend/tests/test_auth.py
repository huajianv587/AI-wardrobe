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
