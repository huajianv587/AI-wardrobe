import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";

import { fetchAssistantOverview, runQuickMode } from "../../services/assistant";
import { hasStoredSession } from "../../services/session";

export default function AssistantPage() {
  const [summary, setSummary] = useState("Loading assistant overview...");
  const [quickModeSummary, setQuickModeSummary] = useState("少思考模式还没触发。");
  const [signedIn, setSignedIn] = useState(hasStoredSession());

  async function loadOverview() {
    if (!hasStoredSession()) {
      setSignedIn(false);
      setSummary("请先登录，助理才能读取你的衣橱和明日天气。");
      return;
    }

    try {
      const payload = await fetchAssistantOverview();
      const locationName = payload?.tomorrow?.weather?.location_name ?? "Tomorrow city";
      const weather = payload?.tomorrow?.weather?.condition_label ?? "weather pending";
      const gaps = Array.isArray(payload?.gaps?.insights) ? payload.gaps.insights.length : 0;
      const reminders = [
        ...(payload?.reminders?.repeat_warning ?? []),
        ...(payload?.reminders?.laundry_and_care ?? []),
        ...(payload?.reminders?.idle_and_seasonal ?? []),
      ].length;
      setSummary(`${locationName} · ${weather} · ${gaps} closet gaps · ${reminders} reminders`);
      setSignedIn(true);
    } catch (nextError) {
      setSignedIn(false);
      setSummary(nextError instanceof Error ? nextError.message : "Could not load assistant overview.");
    }
  }

  useDidShow(() => {
    void loadOverview();
  });

  async function handleQuickMode(mode) {
    try {
      const payload = await runQuickMode(mode);
      const firstOutfit = Array.isArray(payload?.outfits) ? payload.outfits[0] : null;
      setQuickModeSummary(firstOutfit ? `${mode}: ${firstOutfit.title} · ${firstOutfit.rationale}` : "No quick mode payload yet.");
    } catch (nextError) {
      setQuickModeSummary(nextError instanceof Error ? nextError.message : "Could not run quick mode.");
    }
  }

  return (
    <View className="page-shell">
      <View className="hero-card">
        <Text className="eyebrow">贴心助理</Text>
        <Text className="title">明日穿搭、少思考模式、提醒与缺口</Text>
        <Text className="copy">小程序现在直接复用移动端 assistant 聚合接口，未来 App 也可以走同一套返回结构。</Text>
        <View className="story-chip-row">
          <Text className="story-chip">懂你一点点</Text>
          <Text className="story-chip">天气联动</Text>
          <Text className="story-chip">低负担决策</Text>
        </View>
      </View>

      <View className="stack">
        {signedIn ? (
          <>
            <View className="card">
              <Text className="mini-title">Overview</Text>
              <Text className="mini-copy">{summary}</Text>
            </View>

            <View className="card">
              <Text className="mini-title">少思考模式</Text>
              <Text className="soft-note">只点一下就给结果，适合在微信里快速做决定，不让用户先被复杂表单绊住。</Text>
              <View className="chip-row">
                {["上班", "约会", "出门买咖啡", "今天不想费脑"].map((mode) => (
                  <View key={mode} className="chip-pill" onClick={() => void handleQuickMode(mode)}>
                    <Text>{mode}</Text>
                  </View>
                ))}
              </View>
              <Text className="mini-copy">{quickModeSummary}</Text>
            </View>
          </>
        ) : (
          <View className="card">
            <Text className="mini-title">先登录再让助理真正懂你</Text>
            <Text className="mini-copy">{summary}</Text>
            <Button className="primary-button" onClick={() => Taro.navigateTo({ url: "/pages/account/index" })}>
              去登录中心
            </Button>
          </View>
        )}
      </View>

      <View className="floating-footer">
        <Text className="mini-title">明日穿搭入口</Text>
        <Text className="mini-copy">未来这里适合接定位授权、天气刷新和“一键出门”按钮。</Text>
      </View>
    </View>
  );
}
