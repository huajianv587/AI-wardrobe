import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";

import { Button, Card, ErrorBanner, Field, Screen, styles } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Mode = "login" | "register" | "reset";

export default function LoginScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "login") {
        await auth.signIn(email, password);
        router.replace("/");
      } else if (mode === "register") {
        await auth.signUp(email, password, displayName);
        router.replace("/");
      } else {
        const resetMessage = await auth.requestPasswordReset(email);
        setMessage(resetMessage);
      }
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function preview() {
    setBusy(true);
    setError(null);
    try {
      await auth.startPublicSession();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start preview.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen title="AI Wardrobe" subtitle="Sign in to sync your wardrobe, recommendations, try-on previews, and style profile.">
        <Card>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Login" variant={mode === "login" ? "primary" : "secondary"} onPress={() => setMode("login")} />
            <Button label="Register" variant={mode === "register" ? "primary" : "secondary"} onPress={() => setMode("register")} />
          </View>
          <Button label="Reset password" variant={mode === "reset" ? "primary" : "secondary"} onPress={() => setMode("reset")} />
        </Card>

        <Card>
          <ErrorBanner message={error} />
          {message ? <Text style={styles.body}>{message}</Text> : null}
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" />
          {mode === "register" ? (
            <Field label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="How the app should address you" />
          ) : null}
          {mode !== "reset" ? (
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" />
          ) : null}
          <Button
            label={mode === "reset" ? "Send reset instructions" : mode === "register" ? "Create account" : "Sign in"}
            onPress={submit}
            disabled={busy || !email || (mode !== "reset" && password.length < 6)}
          />
        </Card>

        <Card tone="tint">
          <Text style={styles.cardTitle}>Review mode</Text>
          <Text style={styles.body}>Start a shared preview session for App Review or quick demos without creating a private account.</Text>
          <Button label="Continue with preview" variant="secondary" onPress={preview} disabled={busy} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
