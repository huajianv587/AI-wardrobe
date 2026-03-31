from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import logging
import secrets
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from supabase import create_client
from supabase_auth.types import AuthResponse as SupabaseAuthResponse
from supabase_auth.types import User as SupabaseUser

from app.models.auth_session import AuthSessionToken
from app.models.user import User
from app.schemas.auth import AuthSessionResponse, MiniProgramAuthOptionsResponse, UserSummary
from core.config import settings
from db.session import SessionLocal

logger = logging.getLogger(__name__)


def is_enabled() -> bool:
    return bool(settings.supabase_url and settings.supabase_anon_key)


def is_wechat_login_enabled() -> bool:
    return bool(settings.wechat_miniprogram_login_enabled and settings.wechat_miniprogram_app_id and settings.wechat_miniprogram_app_secret)


def _utcnow() -> datetime:
    return datetime.utcnow()


def _epoch_seconds(value: datetime) -> int:
    return int(value.replace(tzinfo=timezone.utc).timestamp())


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _new_token(prefix: str) -> str:
    return f"{prefix}_{secrets.token_urlsafe(32)}"


def _require_configured() -> None:
    if not is_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth is not configured. Fill SUPABASE_URL and SUPABASE_ANON_KEY in .env.",
        )


def _auth_client():
    _require_configured()
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def _service_client():
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _coerce_datetime(value: datetime | str | None) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        normalized = value.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(normalized)
        except ValueError:
            return _utcnow()
    return _utcnow()


def _extract_avatar_url(user: SupabaseUser) -> str | None:
    metadata = user.user_metadata or {}
    return metadata.get("avatar_url") or metadata.get("picture")


def _extract_email(user: SupabaseUser) -> str:
    if user.email:
        return user.email

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Supabase user record does not include an email address.",
    )


def _find_local_session_by_access_token(db: Session, access_token: str) -> AuthSessionToken | None:
    return db.scalar(
        select(AuthSessionToken).where(
            AuthSessionToken.access_token_hash == _hash_token(access_token),
            AuthSessionToken.revoked_at.is_(None),
        )
    )


def _find_local_session_by_refresh_token(db: Session, refresh_token: str) -> AuthSessionToken | None:
    return db.scalar(
        select(AuthSessionToken).where(
            AuthSessionToken.refresh_token_hash == _hash_token(refresh_token),
            AuthSessionToken.revoked_at.is_(None),
        )
    )


def _local_user_from_supabase(db: Session, supabase_user: SupabaseUser) -> User:
    local_user = db.scalar(select(User).where(User.supabase_user_id == supabase_user.id))
    email = _extract_email(supabase_user)
    avatar_url = _extract_avatar_url(supabase_user)

    if local_user is None:
        local_user = User(
            supabase_user_id=supabase_user.id,
            email=email,
            display_name=(supabase_user.user_metadata or {}).get("full_name") or email.split("@")[0],
            auth_provider="supabase",
            password_hash="supabase-managed",
            avatar_url=avatar_url,
            created_at=_coerce_datetime(supabase_user.created_at),
        )
        db.add(local_user)
    else:
        local_user.email = email
        local_user.display_name = (supabase_user.user_metadata or {}).get("full_name") or local_user.display_name or email.split("@")[0]
        local_user.auth_provider = "supabase"
        local_user.avatar_url = avatar_url

    db.commit()
    db.refresh(local_user)
    return local_user


def _local_user_from_wechat(
    db: Session,
    *,
    open_id: str,
    display_name: str | None = None,
    avatar_url: str | None = None,
) -> User:
    local_user = db.scalar(select(User).where(User.wechat_open_id == open_id))
    synthetic_email = f"wx_{open_id}@mini.ai-wardrobe.dev"

    if local_user is None:
        local_user = User(
            email=synthetic_email,
            display_name=display_name or "微信用户",
            auth_provider="wechat-mini",
            wechat_open_id=open_id,
            password_hash="wechat-managed",
            avatar_url=avatar_url,
            created_at=_utcnow(),
        )
        db.add(local_user)
    else:
        local_user.display_name = display_name or local_user.display_name or "微信用户"
        local_user.auth_provider = "wechat-mini"
        local_user.wechat_open_id = open_id
        if avatar_url:
            local_user.avatar_url = avatar_url

    db.commit()
    db.refresh(local_user)
    return local_user


def build_user_summary(user: User) -> UserSummary:
    return UserSummary.model_validate(user)


def _build_local_session_response(
    db: Session,
    user: User,
    *,
    provider: str,
    message: str | None = None,
    device_label: str | None = None,
) -> AuthSessionResponse:
    access_token = _new_token("aw_access")
    refresh_token = _new_token("aw_refresh")
    now = _utcnow()
    expires_at = now + timedelta(minutes=settings.local_access_token_ttl_minutes)
    refresh_expires_at = now + timedelta(days=settings.local_refresh_token_ttl_days)

    session = AuthSessionToken(
        user_id=user.id,
        provider=provider,
        access_token_hash=_hash_token(access_token),
        refresh_token_hash=_hash_token(refresh_token),
        expires_at=expires_at,
        refresh_expires_at=refresh_expires_at,
        device_label=device_label,
        created_at=now,
        updated_at=now,
    )
    db.add(session)
    db.commit()
    db.refresh(user)

    return AuthSessionResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=_epoch_seconds(expires_at),
        expires_in=int((expires_at - now).total_seconds()),
        token_type="bearer",
        requires_email_confirmation=False,
        message=message,
        user=build_user_summary(user),
    )


def _revoke_local_session(db: Session, session: AuthSessionToken) -> None:
    session.revoked_at = _utcnow()
    session.updated_at = _utcnow()
    db.commit()


def _build_session_response(
    db: Session,
    auth_response: SupabaseAuthResponse,
    *,
    fallback_message: str | None = None,
) -> AuthSessionResponse:
    if auth_response.user is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Supabase Auth did not return a user.")

    local_user = _local_user_from_supabase(db, auth_response.user)
    session = auth_response.session

    if session is None:
        return AuthSessionResponse(
            access_token=None,
            refresh_token=None,
            expires_at=None,
            expires_in=None,
            requires_email_confirmation=True,
            message=fallback_message or "Account created. Check your email before signing in.",
            user=build_user_summary(local_user),
        )

    return AuthSessionResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_at=session.expires_at,
        expires_in=session.expires_in,
        token_type=session.token_type,
        requires_email_confirmation=False,
        message=fallback_message,
        user=build_user_summary(local_user),
    )


def sign_up_with_password(db: Session, email: str, password: str) -> AuthSessionResponse:
    try:
        auth_response = _auth_client().auth.sign_up({"email": email, "password": password})
    except Exception as exc:
        logger.warning("Supabase sign-up failed for %s: %s", email, exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return _build_session_response(
        db,
        auth_response,
        fallback_message="Account created. If email confirmation is enabled in Supabase, confirm your inbox before signing in.",
    )


def sign_in_with_password(db: Session, email: str, password: str) -> AuthSessionResponse:
    try:
        auth_response = _auth_client().auth.sign_in_with_password({"email": email, "password": password})
    except Exception as exc:
        logger.warning("Supabase sign-in failed for %s: %s", email, exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect.") from exc

    if auth_response.session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign-in did not return an active session.")

    return _build_session_response(db, auth_response)


def _refresh_local_session(
    db: Session,
    refresh_token: str,
    *,
    access_token: str | None = None,
) -> AuthSessionResponse | None:
    session = _find_local_session_by_refresh_token(db, refresh_token)
    if session is None:
        return None

    now = _utcnow()
    if session.refresh_expires_at <= now or session.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is invalid or expired.")

    if access_token:
        access_session = _find_local_session_by_access_token(db, access_token)
        if access_session is not None and access_session.id != session.id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token does not belong to the current session.")

    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="The session owner no longer exists.")

    _revoke_local_session(db, session)
    return _build_local_session_response(
        db,
        user,
        provider=session.provider,
        message="Session refreshed successfully.",
        device_label=session.device_label,
    )


def refresh_session(
    db: Session,
    refresh_token: str,
    *,
    access_token: str | None = None,
) -> AuthSessionResponse:
    local_response = _refresh_local_session(db, refresh_token, access_token=access_token)
    if local_response is not None:
        return local_response

    try:
        if access_token:
            auth_response = _auth_client().auth.set_session(access_token, refresh_token)
        else:
            auth_response = _auth_client().auth.refresh_session(refresh_token)
    except Exception as exc:
        logger.warning("Supabase session refresh failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is invalid or expired.") from exc

    if auth_response.session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Supabase did not return a refreshed session.")

    return _build_session_response(db, auth_response, fallback_message="Session refreshed successfully.")


def sign_out_session(access_token: str, refresh_token: str | None = None) -> None:
    with SessionLocal() as db:
        local_session = _find_local_session_by_access_token(db, access_token)
        if local_session is not None:
            _revoke_local_session(db, local_session)
            return

        if refresh_token:
            local_refresh_session = _find_local_session_by_refresh_token(db, refresh_token)
            if local_refresh_session is not None:
                _revoke_local_session(db, local_refresh_session)
                return

    if not is_enabled():
        return

    admin_client = _service_client()
    if admin_client is not None:
        try:
            admin_client.auth.admin.sign_out(access_token, "global")
            return
        except Exception as exc:
            logger.warning("Supabase admin sign-out failed, falling back to session sign-out: %s", exc)

    if refresh_token:
        try:
            client = _auth_client()
            client.auth.set_session(access_token, refresh_token)
            client.auth.sign_out({"scope": "global"})
        except Exception as exc:
            logger.warning("Supabase session sign-out failed: %s", exc)


def _get_user_from_local_access_token(db: Session, access_token: str) -> User | None:
    session = _find_local_session_by_access_token(db, access_token)
    if session is None:
        return None

    if session.expires_at <= _utcnow():
        _revoke_local_session(db, session)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Local access token has expired. Refresh the session and try again.")

    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="The session owner no longer exists.")
    return user


def get_current_user_from_token(db: Session, access_token: str) -> User:
    local_user = _get_user_from_local_access_token(db, access_token)
    if local_user is not None:
        return local_user

    try:
        response = _auth_client().auth.get_user(access_token)
    except Exception as exc:
        logger.warning("Supabase token validation failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token.") from exc

    if response is None or response.user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token.")

    return _local_user_from_supabase(db, response.user)


def get_mini_program_auth_options() -> MiniProgramAuthOptionsResponse:
    return MiniProgramAuthOptionsResponse(
        wechat_login_enabled=is_wechat_login_enabled(),
        wechat_test_mode=settings.wechat_miniprogram_test_mode,
        email_test_login_enabled=True,
        wechat_app_id=settings.wechat_miniprogram_app_id or None,
        request_domain=settings.wechat_miniprogram_request_domain or None,
        upload_domain=settings.wechat_miniprogram_upload_domain or None,
        socket_domain=settings.wechat_miniprogram_socket_domain or None,
    )


def _exchange_wechat_code(code: str) -> dict:
    if not settings.wechat_miniprogram_app_id or not settings.wechat_miniprogram_app_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WeChat mini program login is not configured yet. Fill WECHAT_MINIPROGRAM_APP_ID and WECHAT_MINIPROGRAM_APP_SECRET first.",
        )

    query = urlencode(
        {
            "appid": settings.wechat_miniprogram_app_id,
            "secret": settings.wechat_miniprogram_app_secret,
            "js_code": code,
            "grant_type": "authorization_code",
        }
    )
    endpoint = f"{settings.wechat_code2session_base_url.rstrip('/')}/sns/jscode2session?{query}"

    try:
        response = httpx.get(endpoint, timeout=10)
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:
        logger.warning("WeChat code2session failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not contact the WeChat login service.") from exc

    if payload.get("errcode"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"WeChat login failed: {payload.get('errmsg', 'unknown error')}",
        )

    if not payload.get("openid"):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="WeChat login did not return an openid.")

    return payload


def sign_in_with_wechat_code(
    db: Session,
    *,
    code: str,
    display_name: str | None = None,
    avatar_url: str | None = None,
    device_label: str | None = None,
) -> AuthSessionResponse:
    if not settings.wechat_miniprogram_login_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WeChat mini program login is disabled right now. You can still use email login in the testing phase.",
        )

    payload = _exchange_wechat_code(code)
    user = _local_user_from_wechat(
        db,
        open_id=payload["openid"],
        display_name=display_name,
        avatar_url=avatar_url,
    )
    return _build_local_session_response(
        db,
        user,
        provider="wechat-mini",
        device_label=device_label or "wechat-mini-program",
        message="WeChat mini program session established successfully.",
    )
