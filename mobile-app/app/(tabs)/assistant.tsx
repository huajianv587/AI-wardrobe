import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Button, Card, DetailRow, ErrorBanner, Field, InlineNotice, LoadingState, RequireSession, Screen, SectionTitle, SegmentedControl, Tag, styles } from "@/components/ui";
import { asArray, asText } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstOutfit(recommendation: Record<string, unknown> | null) {
  return asArray<Record<string, unknown>>(recommendation?.outfits)[0] || null;
}

export default function AssistantScreen() {
  const auth = useAuth();
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [mode, setMode] = useState("quick");
  const [quickMode, setQuickMode] = useState("workday");
  const [location, setLocation] = useState("Singapore");
  const [schedule, setSchedule] = useState("Workday with normal commute");
  const [packing, setPacking] = useState({ city: "Singapore", days: "3", tripKind: "city break" });
  const [feedbackNote, setFeedbackNote] = useState("");
  const [recommendation, setRecommendation] = useState<Record<string, unknown> | null>(null);
  const [tomorrow, setTomorrow] = useState<Record<string, unknown> | null>(null);
  const [packingPlan, setPackingPlan] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = Boolean(busyAction);

  const load = useCallback(async () => {
    if (!auth.isSignedIn) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await auth.request<Record<string, unknown>>("/api/v1/assistant/overview");
      setOverview(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load assistant.");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  async function generateQuickMode() {
    setBusyAction("Generating looks");
    setError(null);
    setStatus(null);
    try {
      const response = await auth.request<Record<string, unknown>>("/api/v1/assistant/quick-mode", {
        method: "POST",
        body: { mode: quickMode },
        timeoutMs: 45000,
      });
      setRecommendation(response);
      setStatus("Quick recommendation generated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a recommendation.");
    } finally {
      setBusyAction(null);
    }
  }

  async function generateTomorrow() {
    setBusyAction("Planning tomorrow");
    setError(null);
    setStatus(null);
    try {
      const response = await auth.request<Record<string, unknown>>("/api/v1/assistant/tomorrow", {
        method: "POST",
        body: {
          location_query: location,
          schedule,
          has_commute: true,
        },
        timeoutMs: 45000,
      });
      setTomorrow(response);
      setStatus("Tomorrow plan generated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate tomorrow plan.");
    } finally {
      setBusyAction(null);
    }
  }

  async function generatePackingPlan() {
    setBusyAction("Building packing plan");
    setError(null);
    setStatus(null);
    try {
      const response = await auth.request<Record<string, unknown>>("/api/v1/assistant/packing", {
        method: "POST",
        body: {
          city: packing.city,
          days: Math.max(1, Math.min(21, Number.parseInt(packing.days, 10) || 1)),
          trip_kind: packing.tripKind,
          include_commute: true,
        },
        timeoutMs: 45000,
      });
      setPackingPlan(response);
      setStatus("Packing plan generated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build packing plan.");
    } finally {
      setBusyAction(null);
    }
  }

  async function saveRecommendedOutfit() {
    const outfit = firstOutfit(recommendation);
    if (!outfit) {
      return;
    }
    setBusyAction("Saving outfit");
    setError(null);
    setStatus(null);
    try {
      await auth.request("/api/v1/assistant/outfits", {
        method: "POST",
        body: {
          name: asText(outfit.title, "Saved AI look"),
          occasion: quickMode,
          style: asText(recommendation?.profile_summary, quickMode),
          item_ids: asArray<number>(outfit.item_ids),
          reasoning: typeof outfit.rationale === "string" ? outfit.rationale : null,
        },
      });
      setStatus("Outfit saved to your assistant history.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save outfit.");
    } finally {
      setBusyAction(null);
    }
  }

  async function sendFeedback(action: "liked" | "disliked") {
    const outfit = firstOutfit(recommendation);
    setBusyAction("Sending feedback");
    setError(null);
    setStatus(null);
    try {
      await auth.request("/api/v1/assistant/feedback", {
        method: "POST",
        body: {
          prompt: quickMode,
          scene: "mobile-assistant",
          action,
          item_ids: asArray<number>(outfit?.item_ids),
          feedback_note: feedbackNote || null,
          metadata_json: { source: recommendation?.source || "mobile" },
        },
      });
      setStatus("Feedback recorded.");
      setFeedbackNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record feedback.");
    } finally {
      setBusyAction(null);
    }
  }

  const gaps = getRecord(overview?.gaps);
  const reminders = getRecord(overview?.reminders);
  const weather = getRecord(getRecord(overview?.tomorrow).weather);
  const outfits = asArray<Record<string, unknown>>(recommendation?.outfits);
  const morning = getRecord(tomorrow?.morning);
  const evening = getRecord(tomorrow?.evening);
  const packingSuggestions = asArray<Record<string, unknown>>(packingPlan?.suggestions);

  return (
    <Screen title="Assistant" subtitle="Recommendations, weather planning, packing, saved outfits, and feedback loops." refreshing={loading} onRefresh={load}>
      <RequireSession>
        <ErrorBanner message={error} />
        {status ? <InlineNotice title={status} detail={busyAction || undefined} /> : null}
        {loading ? <LoadingState label="Loading assistant" /> : null}

        <Card tone="tint">
          <SectionTitle title="Overview" detail={asText(weather.location_name, "No weather location")} />
          <Text style={styles.body}>{asText(gaps.summary, "Your wardrobe insights will appear here.")}</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Tag label={`${asArray(reminders.repeat_warning).length} repeat`} />
            <Tag label={`${asArray(reminders.laundry_and_care).length} care`} tone="gold" />
            <Tag label={`${asArray(reminders.idle_and_seasonal).length} seasonal`} tone="coral" />
          </View>
        </Card>

        <Card>
          <SectionTitle title="Recommendation center" detail={busyAction || "Choose a workflow"} />
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { label: "Quick", value: "quick" },
              { label: "Tomorrow", value: "tomorrow" },
              { label: "Packing", value: "packing" },
            ]}
          />
        </Card>

        {mode === "quick" ? (
          <Card>
            <SectionTitle title="Quick recommendation" detail="Uses the same backend mode endpoint as web" />
            <Field label="Mode" value={quickMode} onChangeText={setQuickMode} placeholder="workday, dinner, commute" />
            <Button label="Generate looks" onPress={generateQuickMode} disabled={busy || !quickMode} />
            {outfits.length ? (
              <View style={{ gap: 12 }}>
                {outfits.slice(0, 3).map((outfit, index) => (
                  <View key={`${asText(outfit.title)}-${index}`} style={{ gap: 6 }}>
                    <Text style={styles.cardTitle}>{asText(outfit.title, "Suggested look")}</Text>
                    <Text style={styles.body}>{asText(outfit.rationale, "Recommendation rationale pending.")}</Text>
                    <DetailRow label="Confidence" value={asText(outfit.confidence_label || outfit.confidence, "Scored")} />
                  </View>
                ))}
                <Field label="Feedback note" value={feedbackNote} onChangeText={setFeedbackNote} multiline />
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <Button label="Save outfit" variant="secondary" onPress={saveRecommendedOutfit} disabled={busy} />
                  <Button label="Like" variant="secondary" onPress={() => sendFeedback("liked")} disabled={busy} />
                  <Button label="Dislike" variant="secondary" onPress={() => sendFeedback("disliked")} disabled={busy} />
                </View>
              </View>
            ) : <Text style={styles.body}>Choose a mode and generate a recommendation.</Text>}
          </Card>
        ) : null}

        {mode === "tomorrow" ? (
          <Card>
            <SectionTitle title="Tomorrow planner" />
            <Field label="Location" value={location} onChangeText={setLocation} placeholder="Singapore" />
            <Field label="Schedule" value={schedule} onChangeText={setSchedule} multiline />
            <Button label="Plan tomorrow" onPress={generateTomorrow} disabled={busy || !location} />
            {tomorrow ? (
              <View style={{ gap: 10 }}>
                <Text style={styles.body}>{asText(tomorrow.commute_tip, "Commute tip pending.")}</Text>
                <DetailRow label="Morning" value={asText(morning.summary, "No morning plan")} />
                <DetailRow label="Evening" value={asText(evening.summary, "No evening plan")} />
              </View>
            ) : null}
          </Card>
        ) : null}

        {mode === "packing" ? (
          <Card>
            <SectionTitle title="Packing" detail="Capsule suggestions for short trips" />
            <Field label="City" value={packing.city} onChangeText={(value) => setPacking({ ...packing, city: value })} />
            <Field label="Days" value={packing.days} onChangeText={(value) => setPacking({ ...packing, days: value })} keyboardType="numeric" />
            <Field label="Trip kind" value={packing.tripKind} onChangeText={(value) => setPacking({ ...packing, tripKind: value })} />
            <Button label="Build packing plan" onPress={generatePackingPlan} disabled={busy || !packing.city} />
            {packingPlan ? (
              <View style={{ gap: 10 }}>
                <Text style={styles.body}>{asText(packingPlan.capsule_summary, "Packing summary pending.")}</Text>
                {packingSuggestions.slice(0, 5).map((suggestion, index) => (
                  <DetailRow key={`${asText(suggestion.item_id)}-${index}`} label={`Item ${asText(suggestion.item_id, "?")}`} value={asText(suggestion.reason, "Suggested")} />
                ))}
              </View>
            ) : null}
          </Card>
        ) : null}
      </RequireSession>
    </Screen>
  );
}
