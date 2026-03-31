import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";

import { fetchMiniProgramWardrobe } from "../../services/wardrobe";
import { hasStoredSession } from "../../services/session";

export default function WardrobePage() {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(hasStoredSession());

  async function loadWardrobe() {
    if (!hasStoredSession()) {
      setSignedIn(false);
      setPayload(null);
      setError("");
      return;
    }

    try {
      const nextPayload = await fetchMiniProgramWardrobe();
      setPayload(nextPayload);
      setSignedIn(true);
      setError("");
    } catch (nextError) {
      setSignedIn(false);
      setPayload(null);
      setError(nextError instanceof Error ? nextError.message : "Could not load wardrobe cards.");
    }
  }

  useDidShow(() => {
    void loadWardrobe();
  });

  return (
    <View className="page-shell">
      <View className="hero-card">
        <Text className="eyebrow">Mini wardrobe</Text>
        <Text className="title">{signedIn ? payload?.title ?? "Wardrobe page" : "登录后再查看你的私有衣橱"}</Text>
        <Text className="copy">衣橱页现在会读取和网页同一套用户隔离数据，未登录时不会再把 demo 数据误当成你的真实内容。</Text>
      </View>

      <View className="stack">
        {signedIn ? (
          <>
            <View className="card">
              <Text className="mini-title">Items total</Text>
              <Text className="metric-value">{payload?.items_total ?? 0}</Text>
            </View>

            {(payload?.cards ?? []).map((card) => (
              <View key={card.id} className="card">
                <Text className="mini-title">{card.name}</Text>
                <Text className="mini-copy">{card.category} · {card.color}</Text>
                <Text className="mini-copy">{card.tags.join(" · ")}</Text>
                {card.preview_url ? <Text className="mini-copy">{card.preview_url}</Text> : null}
              </View>
            ))}
          </>
        ) : (
          <View className="card">
            <Text className="mini-title">衣橱暂时锁起来了</Text>
            <Text className="mini-copy">先去登录中心完成邮箱测试登录，或者之后启用微信登录，这里才会显示你的私有衣物卡片。</Text>
            <Button className="primary-button" onClick={() => Taro.navigateTo({ url: "/pages/account/index" })}>
              去登录中心
            </Button>
          </View>
        )}

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
