import { ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { absoluteAssetUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const colors = {
  ink: "#12221f",
  muted: "#66746e",
  paper: "#f7f1e8",
  surface: "#fffdf8",
  line: "#e4dcd2",
  teal: "#2f6f68",
  coral: "#c86b4f",
  gold: "#ba8d37",
  danger: "#b3261e",
  success: "#2f7d5a",
  wash: "#fbf7f0",
};

export function Screen({
  title,
  subtitle,
  children,
  refreshing,
  onRefresh,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  action?: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} /> : undefined}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, tone = "surface" }: { children: ReactNode; tone?: "surface" | "tint" }) {
  return <View style={[styles.card, tone === "tint" && styles.tintCard]}>{children}</View>;
}

export function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionHeading} numberOfLines={2}>{title}</Text>
      {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        variant === "secondary" && styles.secondaryButton,
        variant === "danger" && styles.dangerButton,
        disabled && styles.disabledButton,
      ]}
    >
      <Text
        numberOfLines={2}
        style={[
          styles.buttonText,
          variant === "secondary" && styles.secondaryButtonText,
          disabled && styles.disabledButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize="none"
        style={[styles.input, multiline && styles.multilineInput]}
        placeholderTextColor="#8b9a94"
      />
    </View>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <Card>
      <View style={styles.centerRow}>
        <ActivityIndicator color={colors.teal} />
        <Text style={styles.muted}>{label}</Text>
      </View>
    </Card>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <Card tone="tint">
      <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
      {detail ? <Text style={styles.body}>{detail}</Text> : null}
    </Card>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function Tag({ label, tone = "teal" }: { label: string; tone?: "teal" | "gold" | "coral" }) {
  return (
    <View style={[styles.tag, tone === "gold" && styles.goldTag, tone === "coral" && styles.coralTag]}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

export function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function InlineNotice({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>{title}</Text>
      {detail ? <Text style={styles.noticeDetail}>{detail}</Text> : null}
    </View>
  );
}

export function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "Not set"}</Text>
    </View>
  );
}

export function WardrobeImage({ uri }: { uri?: string | null }) {
  const resolved = absoluteAssetUrl(uri);
  if (!resolved) {
    return <View style={styles.imagePlaceholder}><Text style={styles.placeholderText}>AI Wardrobe</Text></View>;
  }
  return <Image source={{ uri: resolved }} style={styles.itemImage} resizeMode="cover" />;
}

export function RequireSession({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.loading) {
    return <LoadingState label="Restoring your session" />;
  }

  if (!auth.isSignedIn) {
    return (
      <EmptyState
        title="Sign in to use your private wardrobe"
        detail="Use email login or start a shared preview session from the Account tab."
      />
    );
  }

  return <>{children}</>;
}

export function ExternalLink({ label, url }: { label: string; url: string }) {
  return <Button label={label} variant="secondary" onPress={() => Linking.openURL(url)} />;
}

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 110,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
    letterSpacing: 0,
  },
  subtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    gap: 11,
    shadowColor: "#2b2118",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  tintCard: {
    backgroundColor: "#f4ebe2",
    borderColor: "#ead7c8",
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700",
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    gap: 4,
  },
  sectionHeading: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  sectionDetail: {
    color: colors.muted,
    fontSize: 13,
  },
  button: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.coral,
  },
  secondaryButton: {
    backgroundColor: colors.wash,
    borderColor: colors.line,
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  disabledButton: {
    backgroundColor: "#d5ddd9",
    borderColor: "#d5ddd9",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 19,
    textAlign: "center",
  },
  secondaryButtonText: {
    color: colors.ink,
  },
  disabledButtonText: {
    color: "#7c8a84",
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderColor: colors.line,
    borderWidth: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 92,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  centerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  errorBanner: {
    borderRadius: 8,
    borderColor: "#efb0a6",
    borderWidth: 1,
    backgroundColor: "#fff2ef",
    padding: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  tag: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#e6f0eb",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  goldTag: {
    backgroundColor: "#f4e7c5",
  },
  coralTag: {
    backgroundColor: "#f8ded4",
  },
  tagText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  segmented: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segmentButton: {
    minHeight: 38,
    borderRadius: 8,
    borderColor: colors.line,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.wash,
  },
  segmentButtonSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  segmentText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  segmentTextSelected: {
    color: colors.surface,
  },
  notice: {
    borderRadius: 8,
    borderColor: colors.line,
    borderWidth: 1,
    backgroundColor: colors.wash,
    padding: 12,
    gap: 4,
  },
  noticeTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  noticeDetail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    flex: 0.9,
  },
  detailValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    flex: 1.6,
    flexShrink: 1,
    textAlign: "right",
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: "#e7eee9",
  },
  imagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e7eee9",
  },
  placeholderText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
});
