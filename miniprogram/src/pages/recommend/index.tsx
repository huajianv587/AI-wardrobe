import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";

import { fetchRecommendation } from "../../services/recommend";
import { hasStoredSession } from "../../services/session";

export default function RecommendPage() {
  const [summary, setSummary] = useState("Loading AI recommendation preview...");
  const [signedIn, setSignedIn] = useState(hasStoredSession());

  async function loadRecommendation() {
    if (!hasStoredSession()) {
      setSignedIn(false);
      setSummary("请先登录，推荐结果才会真正基于你的衣橱生成。");
      return;
    }

    try {
      const payload = await fetchRecommendation("Weekend coffee, soft but polished");
      const firstOutfit = payload && typeof payload === "object" && "outfits" in payload && Array.isArray(payload.outfits)
        ? payload.outfits[0]
        : null;
      setSummary(firstOutfit && typeof firstOutfit === "object" ? `${firstOutfit.title}: ${firstOutfit.rationale}` : "No recommendation response yet.");
      setSignedIn(true);
    } catch (nextError) {
      setSignedIn(false);
      setSummary(nextError instanceof Error ? nextError.message : "Could not load recommendation preview.");
    }
  }

  useDidShow(() => {
    void loadRecommendation();
  });

  return (
    <View className="page-shell">
      <View className="hero-card">
        <Text className="eyebrow">AI styling</Text>
        <Text className="title">Mini-program recommendation lane</Text>
        <Text className="copy">推荐页现在和网页一样走同一个后端推荐主链路。只要你把远程 worker 配好，网页和小程序都会优先复用你的模型。</Text>
      </View>

      <View className="stack">
        <View className="card">
          <Text className="mini-title">Preview response</Text>
          <Text className="mini-copy">{summary}</Text>
          {!signedIn ? (
            <Button className="primary-button" onClick={() => Taro.navigateTo({ url: "/pages/account/index" })}>
              去登录中心
            </Button>
          ) : null}
        </View>
      </View>
    </View>
  );
}
