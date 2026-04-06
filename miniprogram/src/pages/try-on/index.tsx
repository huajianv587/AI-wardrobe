import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Image, Text, View } from "@tarojs/components";

import { renderTryOn } from "../../services/tryon";
import { hasStoredSession } from "../../services/session";
import { fetchMiniProgramWardrobe } from "../../services/wardrobe";

export default function TryOnPage() {
  const [summary, setSummary] = useState("Loading virtual try-on preview...");
  const [previewUrl, setPreviewUrl] = useState("");
  const [signedIn, setSignedIn] = useState(hasStoredSession());

  async function loadTryOn() {
    if (!hasStoredSession()) {
      setSignedIn(false);
      setPreviewUrl("");
      setSummary("请先登录，再让试衣区读取你的账户与试衣衣物。");
      return;
    }

    try {
      const wardrobe = await fetchMiniProgramWardrobe();
      const itemIds = (wardrobe?.cards ?? []).slice(0, 3).map((item) => Number(item.id)).filter(Boolean);
      setSignedIn(true);

      if (!itemIds.length) {
        setPreviewUrl("");
        setSummary("你的衣橱里还没有可试穿的单品，先去上传几件衣服吧。");
        return;
      }

      const payload = await renderTryOn({
        item_ids: itemIds,
        scene: "mini try-on",
        prompt: "Generate a polished mini-program try-on preview.",
      });
      setPreviewUrl(payload.preview_url ?? "");
      setSummary(payload.message ?? "试衣图已经生成。");
    } catch (nextError) {
      setPreviewUrl("");
      setSummary(nextError instanceof Error ? nextError.message : "Could not load try-on preview.");
    }
  }

  useDidShow(() => {
    void loadTryOn();
  });

  return (
    <View className="page-shell">
      <View className="hero-card">
        <Text className="eyebrow">Virtual Try-On</Text>
        <Text className="title">Mini try-on preview</Text>
        <Text className="copy">The mini program now calls the shared production try-on route instead of the older demo workflow adapter.</Text>
      </View>

      <View className="stack">
        <View className="card">
          <Text className="mini-title">Try-on response</Text>
          <Text className="mini-copy">{summary}</Text>
          {previewUrl ? (
            <Image
              src={previewUrl}
              mode="widthFix"
              style={{ width: "100%", borderRadius: "18px", marginTop: "16px" }}
            />
          ) : null}
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
