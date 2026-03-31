import Taro from "@tarojs/taro";

export function readStoredSession() {
  return {
    accessToken: Taro.getStorageSync("accessToken") ?? "",
    refreshToken: Taro.getStorageSync("refreshToken") ?? "",
    expiresAt: Number(Taro.getStorageSync("expiresAt") ?? 0),
  };
}

export function writeStoredSession(payload) {
  Taro.setStorageSync("accessToken", payload.accessToken ?? "");
  Taro.setStorageSync("refreshToken", payload.refreshToken ?? "");
  Taro.setStorageSync("expiresAt", payload.expiresAt ?? 0);
  if (payload.user) {
    Taro.setStorageSync("authUser", payload.user);
  }
}

export function clearStoredSession() {
  Taro.removeStorageSync("accessToken");
  Taro.removeStorageSync("refreshToken");
  Taro.removeStorageSync("expiresAt");
  Taro.removeStorageSync("authUser");
}

export function readStoredUser() {
  return Taro.getStorageSync("authUser") ?? null;
}

export function hasStoredSession() {
  const session = readStoredSession();
  return Boolean(session.accessToken);
}
