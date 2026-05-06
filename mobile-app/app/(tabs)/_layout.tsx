import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/components/ui";

const tabIcons = {
  index: "home-outline",
  wardrobe: "shirt-outline",
  assistant: "sparkles-outline",
  insights: "analytics-outline",
  account: "person-circle-outline",
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 72,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name={tabIcons.index} color={color} size={size} /> }} />
      <Tabs.Screen name="wardrobe" options={{ title: "Wardrobe", tabBarIcon: ({ color, size }) => <Ionicons name={tabIcons.wardrobe} color={color} size={size} /> }} />
      <Tabs.Screen name="assistant" options={{ title: "Assistant", tabBarIcon: ({ color, size }) => <Ionicons name={tabIcons.assistant} color={color} size={size} /> }} />
      <Tabs.Screen name="insights" options={{ title: "Insights", tabBarIcon: ({ color, size }) => <Ionicons name={tabIcons.insights} color={color} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: ({ color, size }) => <Ionicons name={tabIcons.account} color={color} size={size} /> }} />
    </Tabs>
  );
}
