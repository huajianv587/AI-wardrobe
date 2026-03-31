export interface AuthUserSummary {
  id: number;
  supabase_user_id: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface AuthSessionResponse {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  expires_in: number | null;
  token_type: string;
  requires_email_confirmation: boolean;
  message: string | null;
  user: AuthUserSummary;
}

const AUTH_STORAGE_KEY = "ai-wardrobe.auth.session";
const AUTH_EVENT_NAME = "ai-wardrobe:auth-session";

function isBrowser() {
  return typeof window !== "undefined";
}

function emitSessionChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(AUTH_EVENT_NAME));
}

export function readStoredSession(): AuthSessionResponse | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSessionResponse;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function persistAuthSession(session: AuthSessionResponse) {
  if (!isBrowser()) {
    return;
  }

  if (!session.access_token) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    emitSessionChange();
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  emitSessionChange();
}

export function updateStoredSessionUser(user: AuthUserSummary) {
  const current = readStoredSession();
  if (!current) {
    return;
  }

  persistAuthSession({
    ...current,
    user
  });
}

export function clearStoredSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  emitSessionChange();
}

export function getStoredAccessToken() {
  return readStoredSession()?.access_token ?? null;
}

export function subscribeToAuthSession(listener: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === AUTH_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener(AUTH_EVENT_NAME, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(AUTH_EVENT_NAME, listener);
    window.removeEventListener("storage", handleStorage);
  };
}
