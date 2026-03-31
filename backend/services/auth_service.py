from __future__ import annotations

from datetime import datetime
import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from supabase import create_client
from supabase_auth.types import AuthResponse as SupabaseAuthResponse
from supabase_auth.types import User as SupabaseUser

from app.models.user import User
from app.schemas.auth import AuthSessionResponse, UserSummary
from core.config import settings

logger = logging.getLogger(__name__)


def is_enabled() -> bool:
    return bool(settings.supabase_url and settings.supabase_anon_key)


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
            return datetime.utcnow()
    return datetime.utcnow()


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


def _local_user_from_supabase(db: Session, supabase_user: SupabaseUser) -> User:
    local_user = db.scalar(select(User).where(User.supabase_user_id == supabase_user.id))
    email = _extract_email(supabase_user)
    avatar_url = _extract_avatar_url(supabase_user)

    if local_user is None:
        local_user = User(
            supabase_user_id=supabase_user.id,
            email=email,
            password_hash="supabase-managed",
            avatar_url=avatar_url,
            created_at=_coerce_datetime(supabase_user.created_at),
        )
        db.add(local_user)
    else:
        local_user.email = email
        local_user.avatar_url = avatar_url

    db.commit()
    db.refresh(local_user)
    return local_user


def build_user_summary(user: User) -> UserSummary:
    return UserSummary.model_validate(user)


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


def refresh_session(
    db: Session,
    refresh_token: str,
    *,
    access_token: str | None = None,
) -> AuthSessionResponse:
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
            if access_token:
                client.auth.set_session(access_token, refresh_token)
            client.auth.sign_out({"scope": "global"})
        except Exception as exc:
            logger.warning("Supabase session sign-out failed: %s", exc)


def get_current_user_from_token(db: Session, access_token: str) -> User:
    try:
        response = _auth_client().auth.get_user(access_token)
    except Exception as exc:
        logger.warning("Supabase token validation failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token.") from exc

    if response is None or response.user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token.")

    return _local_user_from_supabase(db, response.user)
