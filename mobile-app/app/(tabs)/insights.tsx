import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Button, Card, DetailRow, ErrorBanner, Field, InlineNotice, LoadingState, RequireSession, Screen, SectionTitle, SegmentedControl, Tag, WardrobeImage, styles } from "@/components/ui";
import { asArray, asText } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default function InsightsScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState("smart");
  const [smart, setSmart] = useState<Record<string, unknown> | null>(null);
  const [closet, setCloset] = useState<Record<string, unknown> | null>(null);
  const [diary, setDiary] = useState<Record<string, unknown> | null>(null);
  const [tryOnPrompt, setTryOnPrompt] = useState("Polished city outfit");
  const [tryOnItemIds, setTryOnItemIds] = useState("");
  const [tryOn, setTryOn] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.isSignedIn) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [smartResponse, closetResponse, diaryResponse] = await Promise.all([
        auth.request<Record<string, unknown>>("/api/v1/experience/smart-wardrobe"),
        auth.request<Record<string, unknown>>("/api/v1/experience/closet-analysis"),
        auth.request<Record<string, unknown>>("/api/v1/experience/outfit-diary"),
      ]);
      setSmart(smartResponse);
      setCloset(closetResponse);
      setDiary(diaryResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load insights.");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  async function renderTryOn() {
    setBusy(true);
    setError(null);
    try {
      const itemIds = tryOnItemIds
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value));
      const response = await auth.request<Record<string, unknown>>("/api/v1/try-on/render", {
        method: "POST",
        body: {
          item_ids: itemIds,
          prompt: tryOnPrompt,
          scene: "mobile-app",
        },
        timeoutMs: 60000,
      });
      setTryOn(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not render try-on preview.");
    } finally {
      setBusy(false);
    }
  }

  const smartStats = getRecord(smart?.stats);
  const smartQueue = getRecord(smart?.queue);
  const categoryGaps = asArray<Record<string, unknown>>(closet?.category_gaps);
  const care = getRecord(closet?.care);
  const urgentCare = asArray(care.urgent);
  const diaryLooks = asArray<Record<string, unknown>>(diary?.looks || diary?.logs || diary?.days);
  const tryOnItems = asArray<Record<string, unknown>>(tryOn?.items);

  return (
    <Screen title="Insights" subtitle="Smart wardrobe, closet analysis, outfit diary, and try-on." refreshing={loading} onRefresh={load}>
      <RequireSession>
        <ErrorBanner message={error} />
        {loading ? <LoadingState label="Loading analysis" /> : null}

        <Card>
          <SectionTitle title="Insight views" detail="Separate App Store screenshot flows" />
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { label: "Smart", value: "smart" },
              { label: "Closet", value: "closet" },
              { label: "Diary", value: "diary" },
              { label: "Try-on", value: "tryon" },
            ]}
          />
        </Card>

        {mode === "smart" ? (
          <Card>
            <SectionTitle title="Smart wardrobe" detail="Recognition and cleanup status" />
            <DetailRow label="Total" value={asText(smartStats.total, "0")} />
            <DetailRow label="Processed" value={asText(smartStats.processed, "0")} />
            <DetailRow label="Running" value={asText(smartStats.running, "0")} />
            <DetailRow label="Queue progress" value={`${asText(smartQueue.progress, "0")}%`} />
            <InlineNotice title="Task states" detail="Queued, running, failed, and completed image tasks are shown here after uploads." />
          </Card>
        ) : null}

        {mode === "closet" ? (
          <Card>
            <SectionTitle title="Closet analysis" />
            <DetailRow label="Gap score" value={asText(closet?.gap_score, "Pending")} />
            <DetailRow label="Urgent care" value={urgentCare.length} />
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {categoryGaps.slice(0, 5).map((gap, index) => <Tag key={`${asText(gap.name)}-${index}`} label={`${asText(gap.name, "Gap")} ${asText(gap.count, "0")}`} />)}
            </View>
            {asArray<string>(closet?.gap_suggestions).slice(0, 3).map((suggestion) => <Text key={suggestion} style={styles.body}>{suggestion}</Text>)}
          </Card>
        ) : null}

        {mode === "diary" ? (
          <Card>
            <SectionTitle title="Outfit diary" />
            {diaryLooks.length ? (
              diaryLooks.slice(0, 6).map((entry, index) => (
                <DetailRow key={`${asText(entry.outfit_name || entry.name)}-${index}`} label={asText(entry.outfit_name || entry.name, "Diary entry")} value={asText(entry.occasion || entry.note, "Logged")} />
              ))
            ) : <Text style={styles.body}>Save outfits or log looks to build repeat and care insights.</Text>}
          </Card>
        ) : null}

        {mode === "tryon" ? (
          <Card tone="tint">
            <SectionTitle title="Try-on render" detail="Calls the native client API path without WebView" />
            <Field label="Item IDs" value={tryOnItemIds} onChangeText={setTryOnItemIds} placeholder="1, 2, 3" keyboardType="numeric" />
            <Field label="Prompt" value={tryOnPrompt} onChangeText={setTryOnPrompt} />
            <Button label="Render preview" onPress={renderTryOn} disabled={busy} />
            {tryOn ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.cardTitle}>{asText(tryOn.status, "Rendered")}</Text>
                <Text style={styles.body}>{asText(tryOn.message, "Try-on response received.")}</Text>
                <DetailRow label="Provider" value={asText(tryOn.provider, "local")} />
                <DetailRow label="Mode" value={asText(tryOn.provider_mode, "fallback")} />
                {asText(tryOn.preview_url, "") ? <WardrobeImage uri={asText(tryOn.preview_url, "")} /> : null}
                {tryOnItems.slice(0, 4).map((item, index) => (
                  <DetailRow key={`${asText(item.name)}-${index}`} label={asText(item.slot, "Item")} value={asText(item.name, "Selected item")} />
                ))}
              </View>
            ) : <Text style={styles.body}>Render with no item IDs to verify fallback, or add item IDs after uploading wardrobe photos.</Text>}
          </Card>
        ) : null}
      </RequireSession>
    </Screen>
  );
}
