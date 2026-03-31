import { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";

import { fetchRecommendation } from "../../services/recommend";
import type { MiniProgramSession } from "../../types/api";

function readDemoSession(): MiniProgramSession {
  return {
    accessToken: Taro.getStorageSync("accessToken") ?? "",
    refreshToken: Taro.getStorageSync("refreshToken") ?? ""
  };
}

export default function RecommendPage() {
  const [summary, setSummary] = useState("Loading AI recommendation preview...");

  useEffect(() => {
    fetchRecommendation(readDemoSession(), "Weekend coffee, soft but polished").then((payload) => {
      const firstOutfit = (payload as { outfits?: Array<{ title?: string; rationale?: string }> }).outfits?.[0];
      setSummary(firstOutfit ? `${firstOutfit.title}: ${firstOutfit.rationale}` : "No recommendation response yet.");
    }).catch((nextError) => {
      setSummary(nextError instanceof Error ? nextError.message : "Could not load recommendation preview.");
    });
  }, []);

  return (
    <View className="page-shell">
      <View className="hero-card">
        <Text className="eyebrow">AI styling</Text>
        <Text className="title">Mini-program recommendation lane</Text>
        <Text className="copy">This page is already wired to the same recommendation API as the web app, so the outfit logic does not have to be rewritten for WeChat.</Text>
      </View>

      <View className="stack">
        <View className="card">
          <Text className="mini-title">Preview response</Text>
          <Text className="mini-copy">{summary}</Text>
        </View>
      </View>
    </View>
  );
}
