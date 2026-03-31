import Taro from "@tarojs/taro";

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL ?? "http://localhost:8000";

export async function request(options) {
  const response = await Taro.request({
    url: `${API_BASE_URL}${options.path}`,
    method: options.method ?? "GET",
    data: options.data,
    header: {
      "Content-Type": "application/json",
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {})
    }
  });

  if (response.statusCode >= 400) {
    const detail = typeof response.data === "object" && response.data !== null && "detail" in response.data
      ? response.data.detail
      : null;
    throw new Error(typeof detail === "string" ? detail : "Mini program API request failed.");
  }

  return response.data;
}

async function tryRefreshSession() {
  const refreshToken = Taro.getStorageSync("refreshToken") ?? "";
  const accessToken = Taro.getStorageSync("accessToken") ?? "";

  if (!refreshToken) {
    return null;
  }

  const response = await Taro.request({
    url: `${API_BASE_URL}/api/v1/auth/refresh`,
    method: "POST",
    data: {
      refresh_token: refreshToken,
      access_token: accessToken || undefined,
    },
    header: {
      "Content-Type": "application/json",
    }
  });

  if (response.statusCode >= 400) {
    return null;
  }

  const payload = response.data;
  Taro.setStorageSync("accessToken", payload.access_token ?? "");
  Taro.setStorageSync("refreshToken", payload.refresh_token ?? "");
  Taro.setStorageSync("expiresAt", payload.expires_at ?? 0);
  if (payload.user) {
    Taro.setStorageSync("authUser", payload.user);
  }
  return payload;
}

export async function requestWithStoredSession(options) {
  const accessToken = Taro.getStorageSync("accessToken") ?? "";

  try {
    return await request({
      ...options,
      accessToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const shouldRetry = message.toLowerCase().includes("expired") || message.toLowerCase().includes("invalid") || message.toLowerCase().includes("authentication");

    if (!shouldRetry) {
      throw error;
    }

    const refreshed = await tryRefreshSession();
    if (!refreshed?.access_token) {
      throw error;
    }

    return request({
      ...options,
      accessToken: refreshed.access_token,
    });
  }
}
