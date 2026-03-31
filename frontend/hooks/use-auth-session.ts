"use client";

import { useEffect, useState } from "react";

import { AuthSessionResponse, readStoredSession, subscribeToAuthSession } from "@/lib/auth-session";

export function useAuthSession() {
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSession(readStoredSession());
      setReady(true);
    };

    sync();
    return subscribeToAuthSession(sync);
  }, []);

  return {
    ready,
    session,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.access_token)
  };
}
