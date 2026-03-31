import { useEffect, useState } from "react";
import { Button, Input, Text, View } from "@tarojs/components";

import {
  fetchMiniProgramAuthOptions,
  loginWithEmail,
  loginWithWeChat,
  logoutStoredSession,
} from "../../services/auth";
import { fetchMiniProgramAccount } from "../../services/account";
import { clearStoredSession, hasStoredSession, readStoredUser } from "../../services/session";

export default function AccountPage() {
  const [payload, setPayload] = useState(null);
  const [options, setOptions] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [email, setEmail] = useState("tester@ai-wardrobe.dev");
  const [password, setPassword] = useState("secret123");
  const [busy, setBusy] = useState("");
  const [signedIn, setSignedIn] = useState(hasStoredSession());
  const [localUser, setLocalUser] = useState(readStoredUser());

  async function loadAccount() {
    try {
      const nextPayload = await fetchMiniProgramAccount();
      setPayload(nextPayload);
      setError("");
      setSignedIn(true);
      setLocalUser(readStoredUser());
    } catch (nextError) {
      clearStoredSession();
      setPayload(null);
      setSignedIn(false);
      setLocalUser(null);
      setError(nextError instanceof Error ? nextError.message : "Could not load account summary.");
    }
  }

  useEffect(() => {
    fetchMiniProgramAuthOptions().then(setOptions).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Could not load auth options.");
    });
  }, []);

  useEffect(() => {
    if (!hasStoredSession()) {
      return;
    }
    void loadAccount();
  }, []);

  async function handleEmailLogin() {
    setBusy("email");
    try {
      const response = await loginWithEmail(email, password);
      setStatus(response.message ?? "Email session is ready on this device.");
      await loadAccount();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Email login failed.");
    } finally {
      setBusy("");
    }
  }

  async function handleWeChatLogin() {
    setBusy("wechat");
    try {
      const response = await loginWithWeChat();
      setStatus(response.message ?? "WeChat login completed.");
      await loadAccount();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "WeChat login failed.");
    } finally {
      setBusy("");
    }
  }

  async function handleLogout() {
    setBusy("logout");
    try {
      await logoutStoredSession();
      setPayload(null);
      setSignedIn(false);
      setLocalUser(null);
      setStatus("Local mini-program session cleared.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Logout failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <View className="page-shell">
      <View className="hero-card">
        <Text className="eyebrow">Account sync</Text>
        <Text className="title">
          {signedIn ? payload?.user_email ?? localUser?.email ?? "Signed-in owner summary" : "小程序登录与同步中心"}
        </Text>
        <Text className="copy">
          这里现在同时支持测试阶段邮箱登录，以及配置完成后的微信登录。登录成功后，首页、衣橱、推荐、助理和试衣页都会复用同一套会话。
        </Text>
        <View className="story-chip-row">
          <Text className="story-chip">邮箱测试登录</Text>
          <Text className="story-chip">微信登录占位</Text>
          <Text className="story-chip">自动带 Bearer</Text>
        </View>
      </View>

      {!signedIn ? (
        <View className="stack">
          <View className="card">
            <Text className="mini-title">登录方式</Text>
            <Text className="mini-copy">
              {options?.wechat_login_enabled
                ? "微信登录已经可用，测试阶段仍然可以继续用邮箱登录。"
                : "微信登录还没完成配置，当前先用邮箱测试登录。"}
            </Text>
            {options?.request_domain ? <Text className="mini-copy">请求域名：{options.request_domain}</Text> : null}
          </View>

          <View className="card">
            <Text className="mini-title">测试阶段邮箱登录</Text>
            <Text className="soft-note">如果 Supabase 已经配置好，这里就能直接拿到和网页同一套登录态。</Text>
            <Input
              className="form-input"
              type="text"
              value={email}
              placeholder="Email"
              onInput={(event) => setEmail(event.detail.value)}
            />
            <Input
              className="form-input"
              password
              value={password}
              placeholder="Password"
              onInput={(event) => setPassword(event.detail.value)}
            />
            <Button className="primary-button" loading={busy === "email"} onClick={() => void handleEmailLogin()}>
              邮箱登录
            </Button>
          </View>

          <View className="card">
            <Text className="mini-title">微信登录</Text>
            <Text className="mini-copy">
              {options?.wechat_login_enabled
                ? "已经可以请求微信 code 并向后端换取小程序会话。"
                : "等你填好微信 appid / secret 并打开后端开关后，这里就会真正工作。"}
            </Text>
            <Button
              className={`secondary-button ${options?.wechat_login_enabled ? "" : "secondary-button-disabled"}`.trim()}
              disabled={!options?.wechat_login_enabled || busy === "wechat"}
              loading={busy === "wechat"}
              onClick={() => void handleWeChatLogin()}
            >
              微信一键登录
            </Button>
          </View>
        </View>
      ) : (
        <>
          <View className="metric-grid">
            <View className="metric-card">
              <Text className="metric-label">Mode</Text>
              <Text className="metric-value">{payload?.mode ?? "local-first"}</Text>
            </View>
            <View className="metric-card">
              <Text className="metric-label">Synced items</Text>
              <Text className="metric-value">{payload?.synced_count ?? 0}</Text>
            </View>
          </View>

          <View className="stack">
            <View className="card">
              <Text className="mini-title">Cloud enabled</Text>
              <Text className="mini-copy">{payload?.cloud_enabled ? "Yes" : "No"}</Text>
            </View>
            <View className="card">
              <Text className="mini-title">Items total</Text>
              <Text className="mini-copy">{payload?.items_total ?? 0}</Text>
            </View>
            <View className="card">
              <Text className="mini-title">Latest cloud sync</Text>
              <Text className="mini-copy">{payload?.latest_cloud_sync_at ?? "No sync yet"}</Text>
            </View>
            <View className="card">
              <Text className="mini-title">Current auth provider</Text>
              <Text className="mini-copy">{localUser?.auth_provider ?? "unknown"}</Text>
              <Button className="secondary-button" loading={busy === "logout"} onClick={() => void handleLogout()}>
                退出当前会话
              </Button>
            </View>
          </View>
        </>
      )}

      {status ? (
        <View className="card">
          <Text className="mini-title">Status</Text>
          <Text className="mini-copy">{status}</Text>
        </View>
      ) : null}

      {error ? (
        <View className="card">
          <Text className="mini-title">API note</Text>
          <Text className="mini-copy">{error}</Text>
        </View>
      ) : null}
    </View>
  );
}
