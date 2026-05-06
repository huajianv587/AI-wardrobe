import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { Button, Card, DetailRow, ErrorBanner, LoadingState, RequireSession, Screen, SectionTitle, Tag, styles } from "@/components/ui";
import { asArray, asText } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type DashboardState = {
  bootstrap: Record<string, unknown> | null;
  overview: Record<string, unknown> | null;
};

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default function HomeScreen() {
  const auth = useAuth();
  const [data, setData] = useState<DashboardState>({ bootstrap: null, overview: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.isSignedIn) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [bootstrap, overview] = await Promise.all([
        auth.request<Record<string, unknown>>("/api/v1/client/bootstrap"),
        auth.request<Record<string, unknown>>("/api/v1/client/assistant/overview"),
      ]);
      setData({ bootstrap, overview });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  const wardrobeItems = useMemo(() => {
    const bootstrap = getRecord(data.bootstrap);
    return asArray(getRecord(bootstrap.wardrobe).items || bootstrap.items);
  }, [data.bootstrap]);

  const tomorrow = getRecord(getRecord(data.overview).tomorrow);
  const weather = getRecord(tomorrow.weather);
  const gaps = getRecord(getRecord(data.overview).gaps);
  const recentOutfits = asArray(getRecord(data.overview).recent_saved_outfits);

  return (
    <Screen
      title="Today"
      subtitle={auth.session?.user.display_name || auth.session?.user.email || "AI Wardrobe"}
      refreshing={loading}
      onRefresh={load}
      action={<Button label="Account" variant="secondary" onPress={() => router.push("/account")} />}
    >
      <RequireSession>
        <ErrorBanner message={error} />
        {loading && !data.bootstrap ? <LoadingState label="Loading wardrobe context" /> : null}

        <Card tone="tint">
          <SectionTitle title="Tomorrow planner" detail={asText(weather.location_name, "Location not set")} />
          <Text style={styles.cardTitle}>{asText(weather.condition_label, "Weather pending")}</Text>
          <Text style={styles.body}>{asText(tomorrow.commute_tip, "Add wardrobe items to unlock commute-aware outfit planning.")}</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Tag label={`${asText(weather.temperature_min, "--")} to ${asText(weather.temperature_max, "--")} C`} />
            <Tag label={asText(weather.timezone, "Timezone")} tone="gold" />
          </View>
        </Card>

        <Card>
          <SectionTitle title="Wardrobe status" detail="Synced from the shared FastAPI client contract" />
          <DetailRow label="Items" value={wardrobeItems.length} />
          <DetailRow label="Account" value={auth.session?.user.auth_provider || "local"} />
          <Button label="Manage wardrobe" onPress={() => router.push("/wardrobe")} />
        </Card>

        <Card>
          <SectionTitle title="Closet gaps" />
          <Text style={styles.body}>{asText(gaps.summary, "No closet analysis yet.")}</Text>
          {asArray<Record<string, unknown>>(gaps.insights).slice(0, 3).map((item, index) => (
            <View key={`${asText(item.title)}-${index}`} style={{ gap: 4 }}>
              <Text style={styles.cardTitle}>{asText(item.title, "Gap insight")}</Text>
              <Text style={styles.muted}>{asText(item.description, "Add more wardrobe data to refine this.")}</Text>
            </View>
          ))}
        </Card>

        <Card>
          <SectionTitle title="Saved outfits" />
          {recentOutfits.length ? (
            recentOutfits.slice(0, 3).map((outfit, index) => {
              const record = getRecord(outfit);
              return <DetailRow key={`${asText(record.name)}-${index}`} label={asText(record.name, "Outfit")} value={asText(record.occasion, "Any occasion")} />;
            })
          ) : <Text style={styles.body}>Generate a quick recommendation from the Assistant tab, then save the first look.</Text>}
        </Card>
      </RequireSession>
    </Screen>
  );
}
