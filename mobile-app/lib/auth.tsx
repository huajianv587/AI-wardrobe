import * as SecureStore from "expo-secure-store";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { ApiError, apiRequest, ApiRequestOptions } from "@/lib/api";

export type UserSummary = {
  id: number;
  email: string;
  display_name?: string | null;
  auth_provider?: string | null;
  avatar_url?: string | null;
  created_at?: string;
};

export type AuthSession = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at?: number | null;
  user: UserSummary;
};

type AuthContextValue = {
  loading: boolean;
  session: AuthSession | null;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  startPublicSession: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  request: <T>(path: string, options?: ApiRequestOptions) => Promise<T>;
};

const STORAGE_KEY = "ai-wardrobe.session.v1";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function saveSession(session: AuthSession | null) {
  if (!session) {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session));
}

async function loadSession(): Promise<AuthSession | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback(async (nextSession: AuthSession | null) => {
    setSession(nextSession);
    await saveSession(nextSession);
  }, []);

  const refreshFromStoredSession = useCallback(async (stored: AuthSession): Promise<AuthSession> => {
    if (!stored.refresh_token) {
      throw new Error("No refresh token is stored.");
    }

    const refreshed = await apiRequest<AuthSession>("/api/v1/auth/refresh", {
      method: "POST",
      body: {
        refresh_token: stored.refresh_token,
        access_token: stored.access_token,
      },
    });
    await persist(refreshed);
    return refreshed;
  }, [persist]);

  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        const stored = await loadSession();
        if (!stored) {
          return;
        }

        try {
          await apiRequest<UserSummary>("/api/v1/auth/me", { token: stored.access_token });
          if (active) {
            setSession(stored);
          }
        } catch {
          await refreshFromStoredSession(stored);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    restore();
    return () => {
      active = false;
    };
  }, [refreshFromStoredSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const nextSession = await apiRequest<AuthSession>("/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
    });
    await persist(nextSession);
  }, [persist]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const nextSession = await apiRequest<AuthSession>("/api/v1/auth/sign-up", {
      method: "POST",
      body: { email, password, display_name: displayName || undefined },
    });
    await persist(nextSession);
  }, [persist]);

  const startPublicSession = useCallback(async () => {
    const nextSession = await apiRequest<AuthSession>("/api/v1/auth/public-session", { method: "POST" });
    await persist(nextSession);
  }, [persist]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const response = await apiRequest<{ message: string }>("/api/v1/auth/password-reset", {
      method: "POST",
      body: { email },
    });
    return response.message;
  }, []);

  const clearLocalSession = useCallback(async () => {
    await persist(null);
  }, [persist]);

  const signOut = useCallback(async () => {
    const current = session;
    await clearLocalSession();
    if (current?.access_token) {
      try {
        await apiRequest("/api/v1/auth/logout", {
          method: "POST",
          token: current.access_token,
          body: { refresh_token: current.refresh_token },
        });
      } catch {
        // Local session has already been cleared.
      }
    }
  }, [clearLocalSession, session]);

  const deleteAccount = useCallback(async () => {
    if (!session?.access_token) {
      return;
    }
    await apiRequest("/api/v1/auth/me", {
      method: "DELETE",
      token: session.access_token,
    });
    await persist(null);
  }, [persist, session]);

  const request = useCallback(async <T,>(path: string, options: ApiRequestOptions = {}) => {
    const current = session;
    const token = options.token ?? current?.access_token;

    try {
      return await apiRequest<T>(path, {
        ...options,
        token,
      });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || options.token || !current?.refresh_token) {
        throw error;
      }

      try {
        const refreshed = await refreshFromStoredSession(current);
        return await apiRequest<T>(path, {
          ...options,
          token: refreshed.access_token,
        });
      } catch (refreshError) {
        await clearLocalSession();
        throw refreshError;
      }
    }
  }, [clearLocalSession, refreshFromStoredSession, session]);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    session,
    isSignedIn: Boolean(session?.access_token),
    signIn,
    signUp,
    startPublicSession,
    requestPasswordReset,
    signOut,
    deleteAccount,
    request,
  }), [deleteAccount, loading, request, requestPasswordReset, session, signIn, signOut, signUp, startPublicSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return value;
}
