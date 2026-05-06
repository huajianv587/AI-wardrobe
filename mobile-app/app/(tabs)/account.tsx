import Constants from "expo-constants";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";

import { Button, Card, DetailRow, EmptyState, ErrorBanner, ExternalLink, Field, InlineNotice, LoadingState, RequireSession, Screen, SectionTitle, Tag, styles } from "@/components/ui";
import { API_BASE_URL, asArray, asText } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type StyleProfile = {
  favorite_colors?: string[];
  avoid_colors?: string[];
  favorite_silhouettes?: string[];
  avoid_silhouettes?: string[];
  style_keywords?: string[];
  dislike_keywords?: string[];
  commute_profile?: string | null;
  comfort_priorities?: string[];
  wardrobe_rules?: string[];
  personal_note?: string | null;
};

export default function AccountScreen() {
  const auth = useAuth();
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [form, setForm] = useState({
    favoriteColors: "",
    avoidColors: "",
    styleKeywords: "",
    commuteProfile: "",
    personalNote: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.isSignedIn) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await auth.request<StyleProfile>("/api/v1/assistant/style-profile");
      setProfile(response);
      setForm({
        favoriteColors: asArray<string>(response.favorite_colors).join(", "),
        avoidColors: asArray<string>(response.avoid_colors).join(", "),
        styleKeywords: asArray<string>(response.style_keywords).join(", "),
        commuteProfile: response.commute_profile || "",
        personalNote: response.personal_note || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load account.");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  function splitList(value: string) {
    return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  }

  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      const response = await auth.request<StyleProfile>("/api/v1/assistant/style-profile", {
        method: "PUT",
        body: {
          favorite_colors: splitList(form.favoriteColors),
          avoid_colors: splitList(form.avoidColors),
          style_keywords: splitList(form.styleKeywords),
          commute_profile: form.commuteProfile || null,
          personal_note: form.personalNote || null,
        },
      });
      setProfile(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function startPreview() {
    setError(null);
    try {
      await auth.startPublicSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start preview session.");
    }
  }

  async function confirmDeleteAccount() {
    if (auth.session?.user.auth_provider === "shared-public") {
      setError("Shared preview sessions cannot delete the public review account.");
      return;
    }
    Alert.alert(
      "Delete account",
      "This permanently removes your account and private wardrobe data. Continue to final confirmation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final confirmation",
              "Your wardrobe, uploads, recommendations, diary, profile, and sessions will be removed. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete permanently",
                  style: "destructive",
                  onPress: async () => {
                    setDeleting(true);
                    setError(null);
                    try {
                      await auth.deleteAccount();
                      router.replace("/login");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Could not delete account.");
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || "1";

  return (
    <Screen title="Account" subtitle="Session, style profile, legal links, and account deletion.">
      <ErrorBanner message={error} />

      {!auth.isSignedIn && !auth.loading ? (
        <Card>
          <SectionTitle title="Private account" />
          <Text style={styles.body}>Sign in for private sync, or use the shared preview session for review and demos.</Text>
          <Button label="Sign in" onPress={() => router.push("/login")} />
          <Button label="Start preview session" variant="secondary" onPress={startPreview} />
        </Card>
      ) : null}

      <RequireSession>
        {loading ? <LoadingState label="Loading profile" /> : null}

        <Card tone="tint">
          <SectionTitle title="Session" />
          <DetailRow label="Email" value={auth.session?.user.email} />
          <DetailRow label="Display name" value={auth.session?.user.display_name} />
          <DetailRow label="Provider" value={auth.session?.user.auth_provider} />
          {auth.session?.user.auth_provider === "shared-public" ? <InlineNotice title="Preview session" detail="Shared preview data is read-only for destructive account deletion." /> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Sign out" variant="secondary" onPress={auth.signOut} />
            <Button label="Privacy" variant="secondary" onPress={() => router.push("/legal")} />
          </View>
        </Card>

        <Card>
          <SectionTitle title="Style profile" detail="Used by recommendations and assistant planning" />
          <Field label="Favorite colors" value={form.favoriteColors} onChangeText={(value) => setForm({ ...form, favoriteColors: value })} placeholder="black, ivory, green" />
          <Field label="Avoid colors" value={form.avoidColors} onChangeText={(value) => setForm({ ...form, avoidColors: value })} placeholder="neon, orange" />
          <Field label="Style keywords" value={form.styleKeywords} onChangeText={(value) => setForm({ ...form, styleKeywords: value })} placeholder="minimal, tailored" />
          <Field label="Commute profile" value={form.commuteProfile} onChangeText={(value) => setForm({ ...form, commuteProfile: value })} />
          <Field label="Personal note" value={form.personalNote} onChangeText={(value) => setForm({ ...form, personalNote: value })} multiline />
          <Button label="Save profile" onPress={saveProfile} disabled={saving} />
        </Card>

        {profile ? (
          <Card>
            <SectionTitle title="Current preferences" />
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {asArray<string>(profile.favorite_colors).map((color) => <Tag key={color} label={color} />)}
              {asArray<string>(profile.style_keywords).map((keyword) => <Tag key={keyword} label={keyword} tone="gold" />)}
            </View>
            <Text style={styles.body}>{asText(profile.personal_note, "No personal note yet.")}</Text>
          </Card>
        ) : (
          <EmptyState title="No profile saved yet" detail="Add style preferences to improve recommendations." />
        )}

        <Card>
          <SectionTitle title="App Store review links" />
          <ExternalLink label="Privacy policy URL" url="https://www.aiwardrobes.com/privacy" />
          <ExternalLink label="Support URL" url="https://www.aiwardrobes.com" />
        </Card>

        <Card>
          <SectionTitle title="Build information" />
          <DetailRow label="Version" value={`${appVersion} (${buildNumber})`} />
          <DetailRow label="Bundle ID" value="com.aiwardrobes.app" />
          <DetailRow label="API" value={API_BASE_URL} />
        </Card>

        <Card>
          <SectionTitle title="Delete account" detail="Required for apps that support account creation" />
          <Text style={styles.body}>This removes your account record and associated wardrobe, outfit, assistant, and profile data.</Text>
          <Button label={deleting ? "Deleting account" : "Delete account"} variant="danger" onPress={confirmDeleteAccount} disabled={deleting || auth.session?.user.auth_provider === "shared-public"} />
        </Card>
      </RequireSession>
    </Screen>
  );
}
