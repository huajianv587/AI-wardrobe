"use client";

import { useEffect, useState } from "react";

import { clearStoredSession, persistAuthSession, shouldRefreshSession, AuthSessionResponse, readStoredSession, subscribeToAuthSession } from "@/lib/auth-session";
import { refreshAuthSession } from "@/lib/api";

export function AuthSessionBootstrap() {
  const [session, setSession] = useState<AuthSessionResponse | null>(null);

  useEffect(() => {
    const sync = () => {
      setSession(readStoredSession());
    };

    sync();
    return subscribeToAuthSession(sync);
  }, []);

  useEffect(() => {
    if (!session?.refresh_token || !session.access_token || !session.expires_at) {
      return;
    }

    const refreshToken = session.refresh_token;
    const accessToken = session.access_token;
    const expiresAt = session.expires_at;

    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function refreshNow() {
      try {
        const nextSession = await refreshAuthSession({
          refresh_token: refreshToken,
          access_token: accessToken
        });

        if (!disposed) {
          persistAuthSession(nextSession);
        }
      } catch {
        if (!disposed) {
          clearStoredSession();
        }
      }
    }

    const msUntilRefresh = expiresAt * 1000 - Date.now() - 60_000;

    if (shouldRefreshSession(session)) {
      void refreshNow();
    } else {
      timer = setTimeout(() => {
        void refreshNow();
      }, Math.max(msUntilRefresh, 1_000));
    }

    return () => {
      disposed = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [session]);

  return null;
}
