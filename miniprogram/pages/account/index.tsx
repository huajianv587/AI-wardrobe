import { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";

import { fetchMiniProgramAccount } from "../../services/account";
import type { MiniProgramAccountResponse, MiniProgramSession } from "../../types/api";

function readDemoSession(): MiniProgramSession {
  return {
    accessToken: Taro.getStorageSync("accessToken") ?? "",
    refreshToken: Taro.getStorageSync("refreshToken") ?? ""
  };
}

export default function AccountPage() {
  const [payload, setPayload] = useState<MiniProgramAccountResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMiniProgramAccount(readDemoSession()).then(setPayload).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Could not load account summary.");
    });
  }, []);

  return (
    <View className="page-shell">
      <View className="hero-card">
        <Text className="eyebrow">Account sync</Text>
        <Text className="title">{payload?.user_email ?? "Signed-in owner summary"}</Text>
        <Text className="copy">This page is meant to mirror the web account dashboard in a mobile-friendly, lighter-weight way.</Text>
      </View>

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

        {error ? (
          <View className="card">
            <Text className="mini-title">API note</Text>
            <Text className="mini-copy">{error}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
