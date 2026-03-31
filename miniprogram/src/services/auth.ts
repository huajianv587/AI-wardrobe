import Taro from "@tarojs/taro";

import { request } from "./http";
import { clearStoredSession, readStoredSession, writeStoredSession } from "./session";

export async function fetchMiniProgramAuthOptions() {
  return request({
    path: "/api/v1/auth/mini-program/options",
  });
}

export async function loginWithEmail(email, password) {
  const payload = await request({
    path: "/api/v1/auth/login",
    method: "POST",
    data: { email, password },
  });

  writeStoredSession({
    accessToken: payload.access_token ?? "",
    refreshToken: payload.refresh_token ?? "",
    expiresAt: payload.expires_at ?? 0,
    user: payload.user ?? null,
  });

  return payload;
}

export async function loginWithWeChat() {
  const loginResult = await Taro.login();
  if (!loginResult.code) {
    throw new Error("WeChat login did not return a code.");
  }

  const payload = await request({
    path: "/api/v1/auth/mini-program/login/wechat",
    method: "POST",
    data: {
      code: loginResult.code,
      device_label: "wechat-mini-program",
    },
  });

  writeStoredSession({
    accessToken: payload.access_token ?? "",
    refreshToken: payload.refresh_token ?? "",
    expiresAt: payload.expires_at ?? 0,
    user: payload.user ?? null,
  });

  return payload;
}

export async function refreshStoredSession() {
  const session = readStoredSession();
  if (!session.refreshToken) {
    throw new Error("No refresh token is available on this device.");
  }

  const payload = await request({
    path: "/api/v1/auth/refresh",
    method: "POST",
    data: {
      refresh_token: session.refreshToken,
      access_token: session.accessToken || undefined,
    },
  });

  writeStoredSession({
    accessToken: payload.access_token ?? "",
    refreshToken: payload.refresh_token ?? "",
    expiresAt: payload.expires_at ?? 0,
    user: payload.user ?? null,
  });

  return payload;
}

export async function logoutStoredSession() {
  const session = readStoredSession();

  try {
    if (session.accessToken || session.refreshToken) {
      await request({
        path: "/api/v1/auth/logout",
        method: "POST",
        data: { refresh_token: session.refreshToken || undefined },
        accessToken: session.accessToken || undefined,
      });
    }
  } finally {
    clearStoredSession();
  }
}
