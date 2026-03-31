import { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";

import { fetchMiniProgramHome } from "../../services/account";

function readDemoSession() {
  return {
    accessToken: Taro.getStorageSync("accessToken") ?? "",
    refreshToken: Taro.getStorageSync("refreshToken") ?? ""
  };
}

export default function IndexPage() {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMiniProgramHome(readDemoSession()).then(setPayload).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Could not load home payload.");
    });
  }, []);

  return (
    <View className="page-shell">
      <View className="hero-card">
        <Text className="eyebrow">Pocket assistant</Text>
        <Text className="title">{payload?.greeting ?? "Mini program home is ready for API wiring."}</Text>
        <Text className="copy">This page now talks to the shared mobile bootstrap API, so future iOS and Android clients can reuse the same aggregated payloads.</Text>
        <View className="story-chip-row">
          <Text className="story-chip">温柔首页</Text>
          <Text className="story-chip">单手操作区</Text>
          <Text className="story-chip">共用移动端 API</Text>
        </View>

        <View className="metric-grid">
          <View className="metric-card">
            <Text className="metric-label">Wardrobe items</Text>
            <Text className="metric-value">{payload?.wardrobe_count ?? 0}</Text>
          </View>
          <View className="metric-card">
            <Text className="metric-label">Synced to cloud</Text>
            <Text className="metric-value">{payload?.synced_count ?? 0}</Text>
          </View>
        </View>
      </View>

      <View className="stack">
        <View className="card">
          <Text className="mini-title">Shortcuts</Text>
          <Text className="soft-note">把最常用的几个入口前置，未来这里可以直接变成上传、明日穿搭、少思考模式的快捷区。</Text>
          <View className="shortcut-grid">
            {(payload?.shortcuts ?? []).map((shortcut) => (
              <View key={shortcut.id} className="shortcut-card" onClick={() => Taro.navigateTo({ url: shortcut.route })}>
                <Text className="mini-title">{shortcut.title}</Text>
                <Text className="mini-copy">{shortcut.subtitle}</Text>
                <Text className="mini-copy">{shortcut.badge ? `· ${shortcut.badge}` : shortcut.route}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="card">
          <Text className="mini-title">Workflow preview</Text>
          {(payload?.workflow_preview ?? []).map((workflow) => (
            <View key={workflow.id} className="mini-card">
              <Text className="mini-title">{workflow.title}</Text>
              <Text className="mini-copy">{workflow.priority} · {workflow.stage}</Text>
            </View>
          ))}
        </View>

        {error ? (
          <View className="card">
            <Text className="mini-title">API note</Text>
            <Text className="mini-copy">{error}</Text>
          </View>
        ) : null}
      </View>

      <View className="floating-footer">
        <Text className="mini-title">单手快速区</Text>
        <Text className="mini-copy">把常用入口放到底部可触达区，未来这里适合做真正的 tab bar 和上传捷径。</Text>
      </View>
    </View>
  );
}
