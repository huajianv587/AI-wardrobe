import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>AI Wardrobe mobile shell</Text>
          <Text style={styles.title}>Future iOS / Android home already has a place to land.</Text>
          <Text style={styles.copy}>
            Reuse `/api/v1/client/bootstrap`, `/api/v1/client/wardrobe`, and `/api/v1/client/assistant/*`
            so the app can share the same assistant, wardrobe, and recommendation contracts as web and mini-program.
          </Text>
          <View style={styles.storyChipRow}>
            <Text style={styles.storyChip}>Thumb-first</Text>
            <Text style={styles.storyChip}>Soft planning</Text>
            <Text style={styles.storyChip}>Shared API</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Suggested next native milestones</Text>
          <Text style={styles.cardCopy}>1. Email/password auth screen using the same Supabase flow.</Text>
          <Text style={styles.cardCopy}>2. Assistant overview screen for tomorrow planner and reminders.</Text>
          <Text style={styles.cardCopy}>3. Wardrobe upload + image cleanup queue progress.</Text>
          <Text style={styles.cardCopy}>4. Quick mode and saved outfits tabs.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shared backend contract</Text>
          <Text style={styles.cardCopy}>All native requests should keep going through the same backend contract as web and mini-program.</Text>
          <View style={styles.runtimePill}>
            <Text style={styles.runtimeLabel}>EXPO_PUBLIC_API_BASE_URL</Text>
            <Text style={styles.runtimeValue}>{API_BASE_URL}</Text>
          </View>
          <Text style={styles.cardCopy}>This keeps auth, Redis-backed task polling, recommendation routing, and hybrid try-on behavior aligned across every client.</Text>
        </View>

        <View style={styles.thumbZone}>
          <View style={styles.thumbItem}>
            <Text style={styles.thumbLabel}>Home</Text>
          </View>
          <View style={[styles.thumbItem, styles.thumbItemActive]}>
            <Text style={styles.thumbLabelActive}>Assistant</Text>
          </View>
          <View style={styles.thumbItem}>
            <Text style={styles.thumbLabel}>Closet</Text>
          </View>
          <View style={styles.thumbItem}>
            <Text style={styles.thumbLabel}>Looks</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fdf8f2"
  },
  container: {
    padding: 24,
    gap: 18
  },
  hero: {
    borderRadius: 28,
    backgroundColor: "#fff4e9",
    padding: 24,
    shadowColor: "#ff9a7b",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10
  },
  eyebrow: {
    fontSize: 14,
    color: "#6d7382"
  },
  title: {
    marginTop: 12,
    fontSize: 30,
    fontWeight: "700",
    color: "#1b2432"
  },
  copy: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: "#5f6b7a"
  },
  storyChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18
  },
  storyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.84)",
    color: "#5f6b7a",
    overflow: "hidden"
  },
  card: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 20,
    shadowColor: "#45361f",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1b2432"
  },
  cardCopy: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: "#5f6b7a"
  },
  runtimePill: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: "#f7ede2",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  runtimeLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#8d6f52"
  },
  runtimeValue: {
    marginTop: 8,
    fontSize: 14,
    color: "#1b2432",
    fontWeight: "600"
  },
  thumbZone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 10,
    shadowColor: "#45361f",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  thumbItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    borderRadius: 18
  },
  thumbItemActive: {
    backgroundColor: "#1b2432"
  },
  thumbLabel: {
    fontSize: 13,
    color: "#6d7382"
  },
  thumbLabelActive: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "700"
  }
});
