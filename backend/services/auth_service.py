from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
import hashlib
from hmac import compare_digest
import logging
import secrets
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from supabase import create_client
from supabase_auth.types import AuthResponse as SupabaseAuthResponse
from supabase_auth.types import User as SupabaseUser

from app.models.auth_session import AuthSessionToken
from app.models.password_reset import PasswordResetToken
from app.models.user import User
from app.schemas.auth import AuthSessionResponse, MiniProgramAuthOptionsResponse, OAuthStartResponse, StatusMessageResponse, UserSummary
from core.config import settings
from db.session import SessionLocal
logger = logging.getLogger(__name__)

LOCAL_PASSWORD_SCHEME = "pbkdf2_sha256"
LOCAL_PASSWORD_ITERATIONS = 480_000


def is_enabled() -> bool:
    return bool(settings.supabase_url and settings.supabase_anon_key)


def is_wechat_login_enabled() -> bool:
    return bool(settings.wechat_miniprogram_login_enabled and settings.wechat_miniprogram_app_id and settings.wechat_miniprogram_app_secret)


def _utcnow() -> datetime:
    return datetime.utcnow()


def _as_utc_naive(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _epoch_seconds(value: datetime) -> int:
    normalized = _as_utc_naive(value) or value
    return int(normalized.replace(tzinfo=timezone.utc).timestamp())


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _new_token(prefix: str) -> str:
    return f"{prefix}_{secrets.token_urlsafe(32)}"


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _is_local_password_hash(password_hash: str | None) -> bool:
    return bool(password_hash and password_hash.startswith(f"{LOCAL_PASSWORD_SCHEME}$"))


def _hash_local_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, LOCAL_PASSWORD_ITERATIONS)
    return f"{LOCAL_PASSWORD_SCHEME}${LOCAL_PASSWORD_ITERATIONS}${_b64encode(salt)}${_b64encode(derived)}"


def _verify_local_password(password: str, password_hash: str) -> bool:
    if not _is_local_password_hash(password_hash):
        return False

    try:
        scheme, iterations_text, salt_text, expected_text = password_hash.split("$", 3)
        if scheme != LOCAL_PASSWORD_SCHEME:
            return False
        iterations = int(iterations_text)
        salt = _b64decode(salt_text)
        expected = _b64decode(expected_text)
    except Exception:
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return compare_digest(actual, expected)


def _find_local_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == _normalize_email(email)))


def _default_display_name(email: str) -> str:
    return _normalize_email(email).split("@")[0]


def _upsert_local_display_name(db: Session, user: User, display_name: str | None) -> User:
    normalized_display_name = (display_name or "").strip() or _default_display_name(user.email)
    if user.display_name == normalized_display_name:
        return user

    user.display_name = normalized_display_name
    db.commit()
    db.refresh(user)
    return user


def _create_local_password_user(db: Session, email: str, password: str, *, display_name: str | None = None) -> User:
    normalized_email = _normalize_email(email)
    user = User(
        email=normalized_email,
        display_name=(display_name or "").strip() or _default_display_name(normalized_email),
        auth_provider="local",
        password_hash=_hash_local_password(password),
        created_at=_utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _can_use_direct_password_reset(user: User | None) -> bool:
    if user is None:
        return False
    return user.auth_provider != "wechat-mini"


def _set_local_password(user: User, new_password: str) -> None:
    user.password_hash = _hash_local_password(new_password)
    if user.auth_provider != "wechat-mini":
        user.auth_provider = "local"


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
        return _normalize_email(user.email)

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


def _find_local_password_reset_token(db: Session, token: str) -> PasswordResetToken | None:
    return db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == _hash_token(token)))


def _mark_user_sessions_revoked(db: Session, user_id: int) -> None:
    now = _utcnow()
    sessions = list(
        db.scalars(
            select(AuthSessionToken).where(
                AuthSessionToken.user_id == user_id,
                AuthSessionToken.revoked_at.is_(None),
            )
        ).all()
    )
    for session in sessions:
        session.revoked_at = now
        session.updated_at = now


def _mark_password_reset_tokens_used(db: Session, user_id: int, *, skip_token_hash: str | None = None) -> None:
    now = _utcnow()
    tokens = list(
        db.scalars(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user_id,
                PasswordResetToken.used_at.is_(None),
            )
        ).all()
    )
    for token in tokens:
        if skip_token_hash and token.token_hash == skip_token_hash:
            continue
        token.used_at = now


def _password_reset_base_url(redirect_to: str | None = None) -> str:
    fallback = f"{settings.next_public_app_url.rstrip('/')}/reset-password"
    target = (redirect_to or "").strip() or fallback
    parts = urlsplit(target)
    path = parts.path or "/reset-password"
    normalized_path = path.rstrip("/") or path
    if normalized_path.endswith("/login") or normalized_path.endswith("/register"):
        head = normalized_path.rsplit("/", 1)[0]
        path = f"{head}/reset-password" if head else "/reset-password"
    elif normalized_path in {"", "/"}:
        path = "/reset-password"
    return urlunsplit((parts.scheme, parts.netloc, path, parts.query, ""))


def _append_query_params(url: str, **params: str) -> str:
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.update(params)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def _signup_email_redirect_url(redirect_to: str | None = None) -> str:
    fallback = f"{settings.next_public_app_url.rstrip('/')}/login"
    target = (redirect_to or "").strip() or fallback
    parts = urlsplit(target)
    path = parts.path or "/login"
    normalized_path = path.rstrip("/") or path
    if normalized_path.endswith("/register"):
        head = normalized_path.rsplit("/", 1)[0]
        path = f"{head}/login" if head else "/login"
    elif normalized_path in {"", "/"}:
        path = "/login"
    return urlunsplit((parts.scheme, parts.netloc, path, parts.query, ""))


def _response_to_dict(response: object) -> dict:
    if hasattr(response, "model_dump"):
        dumped = response.model_dump()
        if isinstance(dumped, dict):
            return dumped
    if isinstance(response, dict):
        return response
    if hasattr(response, "__dict__"):
        return {
            key: value
            for key, value in vars(response).items()
            if not key.startswith("_")
        }
    return {}


def _local_user_from_supabase(db: Session, supabase_user: SupabaseUser) -> User:
    local_user = db.scalar(select(User).where(User.supabase_user_id == supabase_user.id))
    email = _extract_email(supabase_user)
    avatar_url = _extract_avatar_url(supabase_user)

    if local_user is None:
        local_user = _find_local_user_by_email(db, email)

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
        local_user.supabase_user_id = supabase_user.id
        local_user.email = email
        local_user.display_name = (supabase_user.user_metadata or {}).get("full_name") or local_user.display_name or email.split("@")[0]
        local_user.auth_provider = "supabase"
        if not _is_local_password_hash(local_user.password_hash):
            local_user.password_hash = "supabase-managed"
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
    synthetic_email = _normalize_email(f"wx_{open_id}@mini.ai-wardrobe.dev")

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


def sign_up_with_password(
    db: Session,
    email: str,
    password: str,
    *,
    display_name: str | None = None,
    redirect_to: str | None = None,
) -> AuthSessionResponse:
    normalized_email = _normalize_email(email)
    if _find_local_user_by_email(db, normalized_email) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="这个邮箱已经注册过了，请直接登录。")

    user = _create_local_password_user(db, normalized_email, password, display_name=display_name)
    return _build_local_session_response(
        db,
        user,
        provider="local",
        device_label="email-password-local",
        message="账号已创建，并已自动登录。",
    )


def sign_in_with_password(db: Session, email: str, password: str) -> AuthSessionResponse:
    normalized_email = _normalize_email(email)
    local_user = _find_local_user_by_email(db, normalized_email)

    if local_user is not None and _is_local_password_hash(local_user.password_hash):
        if not _verify_local_password(password, local_user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="邮箱或密码不正确。")

        return _build_local_session_response(
            db,
            local_user,
            provider="local",
            device_label="email-password-local",
            message="登录成功。",
        )

    if not is_enabled():
        if local_user is not None and local_user.auth_provider == "wechat-mini":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="这个账号需要使用微信小程序登录。")
        if local_user is not None and not _is_local_password_hash(local_user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="当前账号需要使用原有登录方式。")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="邮箱或密码不正确。")

    try:
        auth_response = _auth_client().auth.sign_in_with_password({"email": normalized_email, "password": password})
    except Exception as exc:
        logger.warning("Supabase sign-in failed for %s: %s", normalized_email, exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect.") from exc

    if auth_response.session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign-in did not return an active session.")

    return _build_session_response(db, auth_response)


def send_password_reset_email(db: Session, email: str, redirect_to: str | None = None) -> StatusMessageResponse:
    normalized_email = _normalize_email(email)
    reset_base_url = _password_reset_base_url(redirect_to)
    user = _find_local_user_by_email(db, normalized_email)

    if not _can_use_direct_password_reset(user):
        return StatusMessageResponse(
            status="unavailable",
            message="This email account does not support direct password reset.",
        )

    reset_url = _append_query_params(reset_base_url, email=normalized_email)
    return StatusMessageResponse(
        status="ready",
        message="Password reset is ready. Open the reset page and set a new password directly.",
        action_url=reset_url,
        action_label="Open reset password page",
    )


def reset_password_with_token(
    db: Session,
    *,
    email: str | None = None,
    token: str | None = None,
    access_token: str | None = None,
    new_password: str,
) -> StatusMessageResponse:
    normalized_email = _normalize_email(email) if email else ""
    if normalized_email:
        user = _find_local_user_by_email(db, normalized_email)
        if not _can_use_direct_password_reset(user):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No resettable account was found for this email.")

        _set_local_password(user, new_password)
        _mark_password_reset_tokens_used(db, user.id)
        _mark_user_sessions_revoked(db, user.id)
        db.commit()
        return StatusMessageResponse(
            status="updated",
            message="Password updated successfully. Please sign in again with the new password.",
        )

    normalized_token = (token or "").strip()
    if normalized_token:
        reset_token = _find_local_password_reset_token(db, normalized_token)
        expires_at = _as_utc_naive(reset_token.expires_at) if reset_token is not None else None
        if reset_token is None or reset_token.used_at is not None or expires_at is None or expires_at <= _utcnow():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The password reset token is invalid or expired.")

        user = db.get(User, reset_token.user_id)
        if not _can_use_direct_password_reset(user):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This account does not support token-based password reset.")

        _set_local_password(user, new_password)
        reset_token.used_at = _utcnow()
        _mark_password_reset_tokens_used(db, user.id, skip_token_hash=reset_token.token_hash)
        _mark_user_sessions_revoked(db, user.id)
        db.commit()
        return StatusMessageResponse(
            status="updated",
            message="Password updated successfully. Please sign in again with the new password.",
        )

    normalized_access_token = (access_token or "").strip()
    if normalized_access_token:
        if not is_enabled():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cloud password recovery is not enabled in this environment.")

        admin_client = _service_client()
        if admin_client is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase service role is required to complete password recovery.")

        try:
            response = _auth_client().auth.get_user(normalized_access_token)
            if response is None or response.user is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recovery session is invalid or expired.")
            admin_client.auth.admin.update_user_by_id(response.user.id, {"password": new_password})
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Supabase password recovery update failed: %s", exc)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not update the password from the recovery link.") from exc

        local_user = _find_local_user_by_email(db, _extract_email(response.user))
        if local_user is not None and _can_use_direct_password_reset(local_user):
            _set_local_password(local_user, new_password)
            _mark_password_reset_tokens_used(db, local_user.id)
            _mark_user_sessions_revoked(db, local_user.id)
            db.commit()

        return StatusMessageResponse(
            status="updated",
            message="Password updated successfully. Please sign in again with the new password.",
        )

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing a valid password reset credential.")


def build_oauth_start_url(provider: str, redirect_to: str | None = None) -> OAuthStartResponse:
    normalized_provider = provider.lower().strip()
    if normalized_provider not in {"google", "facebook"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported OAuth provider.")

    try:
        options = {"redirect_to": redirect_to} if redirect_to else {}
        response = _auth_client().auth.sign_in_with_oauth({"provider": normalized_provider, "options": options})
    except Exception as exc:
        logger.warning("Supabase OAuth start failed for %s: %s", normalized_provider, exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not start {normalized_provider} OAuth flow.") from exc

    return OAuthStartResponse(provider=normalized_provider, url=response.url)


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
    refresh_expires_at = _as_utc_naive(session.refresh_expires_at)
    if refresh_expires_at is None or refresh_expires_at <= now or session.revoked_at is not None:
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

    if not is_enabled():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is invalid or expired.")

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

    expires_at = _as_utc_naive(session.expires_at)
    if expires_at is None or expires_at <= _utcnow():
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

    if not is_enabled():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token.")

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
