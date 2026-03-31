import { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";

import { fetchMiniProgramWardrobe } from "../../services/wardrobe";

function readDemoSession() {
  return {
    accessToken: Taro.getStorageSync("accessToken") ?? "",
    refreshToken: Taro.getStorageSync("refreshToken") ?? ""
  };
}

export default function WardrobePage() {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMiniProgramWardrobe(readDemoSession()).then(setPayload).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Could not load wardrobe cards.");
    });
  }, []);

  return (
    <View className="page-shell">
      <View className="hero-card">
        <Text className="eyebrow">Mini wardrobe</Text>
        <Text className="title">{payload?.title ?? "Wardrobe page"}</Text>
        <Text className="copy">This page uses the shared mobile wardrobe payload, so mini program and future native app can render the same card contract.</Text>
      </View>

      <View className="stack">
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
