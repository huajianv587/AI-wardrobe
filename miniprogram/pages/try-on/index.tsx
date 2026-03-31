import { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";

import { fetchAiDemoWorkflows, runAiDemoWorkflow } from "../../services/ai";
import type { AiDemoWorkflow, MiniProgramSession } from "../../types/api";

function readDemoSession(): MiniProgramSession {
  return {
    accessToken: Taro.getStorageSync("accessToken") ?? "",
    refreshToken: Taro.getStorageSync("refreshToken") ?? ""
  };
}

export default function TryOnPage() {
  const [workflow, setWorkflow] = useState<AiDemoWorkflow | null>(null);
  const [summary, setSummary] = useState("Loading virtual try-on adapter...");

  useEffect(() => {
    const session = readDemoSession();

    fetchAiDemoWorkflows(session).then((workflows) => {
      const target = workflows.find((item) => item.id === "ootdiffusion-virtual-tryon") ?? null;
      setWorkflow(target);

      if (!target) {
        setSummary("Virtual try-on workflow is not available yet.");
        return;
      }

      return runAiDemoWorkflow(session, {
        workflow_id: target.id,
        prompt: "Generate a polished try-on preview for a weekend look"
      }).then((payload) => {
        setSummary(payload.summary);
      });
    }).catch((nextError) => {
      setSummary(nextError instanceof Error ? nextError.message : "Could not load try-on adapter.");
    });
  }, []);

  return (
    <View className="page-shell">
      <View className="hero-card">
        <Text className="eyebrow">2.5D Try-On</Text>
        <Text className="title">{workflow?.title ?? "Mini try-on preview"}</Text>
        <Text className="copy">The mini program can call the same AI demo route used by the web app, then later switch to your own OOTDiffusion or VITON worker behind the same adapter.</Text>
      </View>

      <View className="stack">
        <View className="card">
          <Text className="mini-title">Adapter response</Text>
          <Text className="mini-copy">{summary}</Text>
        </View>
      </View>
    </View>
  );
}
