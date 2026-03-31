import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";

import { fetchAiDemoWorkflows, runAiDemoWorkflow } from "../../services/ai";
import { hasStoredSession } from "../../services/session";

export default function TryOnPage() {
  const [workflow, setWorkflow] = useState(null);
  const [summary, setSummary] = useState("Loading virtual try-on adapter...");
  const [signedIn, setSignedIn] = useState(hasStoredSession());

  async function loadTryOn() {
    if (!hasStoredSession()) {
      setSignedIn(false);
      setWorkflow(null);
      setSummary("请先登录，再让试衣区读取你的账户与 AI workflow。");
      return;
    }

    try {
      const workflows = await fetchAiDemoWorkflows();
      const target = workflows.find((item) => item.id === "ootdiffusion-virtual-tryon") ?? null;
      setWorkflow(target);
      setSignedIn(true);

      if (!target) {
        setSummary("Virtual try-on workflow is not available yet.");
        return;
      }

      const payload = await runAiDemoWorkflow({
        workflow_id: target.id,
        prompt: "Generate a polished try-on preview for a weekend look",
      });
      setSummary(payload.summary);
    } catch (nextError) {
      setSignedIn(false);
      setSummary(nextError instanceof Error ? nextError.message : "Could not load try-on adapter.");
    }
  }

  useDidShow(() => {
    void loadTryOn();
  });

  return (
    <View className="page-shell">
      <View className="hero-card">
        <Text className="eyebrow">2.5D Try-On</Text>
        <Text className="title">{workflow?.title ?? "Mini try-on preview"}</Text>
        <Text className="copy">The mini program can already call the shared AI workflow list plus the unified try-on demo route.</Text>
      </View>

      <View className="stack">
        <View className="card">
          <Text className="mini-title">Adapter response</Text>
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
