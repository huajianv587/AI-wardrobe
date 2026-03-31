import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";

import { fetchMiniProgramHome } from "../../services/account";
import { hasStoredSession } from "../../services/session";

export default function IndexPage() {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(hasStoredSession());

  async function loadHome() {
    if (!hasStoredSession()) {
      setSignedIn(false);
      setPayload(null);
      setError("");
      return;
    }

    try {
      const nextPayload = await fetchMiniProgramHome();
      setPayload(nextPayload);
      setSignedIn(true);
      setError("");
    } catch (nextError) {
      setSignedIn(false);
      setPayload(null);
      setError(nextError instanceof Error ? nextError.message : "Could not load home payload.");
    }
  }

  useDidShow(() => {
    void loadHome();
  });

  return (
    <View className="page-shell">
      <View className="hero-card">
        <Text className="eyebrow">Pocket assistant</Text>
        <Text className="title">{signedIn ? payload?.greeting ?? "欢迎回到你的衣橱口袋版" : "先登录，再把今天的穿搭决定变简单"}</Text>
        <Text className="copy">首页现在直接复用共享移动端聚合接口。登录成功后，首页、助理、推荐、试衣和衣橱会共用同一套会话与数据。</Text>
        <View className="story-chip-row">
          <Text className="story-chip">温柔首页</Text>
          <Text className="story-chip">单手操作区</Text>
          <Text className="story-chip">共用移动端 API</Text>
        </View>

        {signedIn ? (
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
        ) : null}
      </View>

      {!signedIn ? (
        <View className="stack">
          <View className="card">
            <Text className="mini-title">还差一步</Text>
            <Text className="mini-copy">去账号页先完成邮箱测试登录，或者等你把微信小程序 appid / secret 配好之后直接微信登录。</Text>
            <Button className="primary-button" onClick={() => Taro.navigateTo({ url: "/pages/account/index" })}>
              去登录中心
            </Button>
          </View>
        </View>
      ) : (
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
        </View>
      )}

      {error ? (
        <View className="card">
          <Text className="mini-title">API note</Text>
          <Text className="mini-copy">{error}</Text>
        </View>
      ) : null}

      <View className="floating-footer">
        <Text className="mini-title">单手快速区</Text>
        <Text className="mini-copy">把常用入口放到底部可触达区，未来这里适合做真正的 tab bar 和上传捷径。</Text>
      </View>
    </View>
  );
}
