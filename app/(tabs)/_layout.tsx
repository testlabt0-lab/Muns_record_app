import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appTheme } from "@/lib/app-theme";

const iconMap = {
  index: "space-dashboard",
  study: "account-tree",
  library: "auto-stories",
  settings: "tune",
} as const;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: appTheme.primary,
      tabBarInactiveTintColor: "#94A3B8",
      tabBarStyle: [styles.tabBar, { height: 58 + bottomPadding, paddingBottom: bottomPadding }],
      tabBarLabelStyle: styles.tabLabel,
      tabBarIcon: ({ color, focused }) => <MaterialIcons name={iconMap[route.name as keyof typeof iconMap]} size={focused ? 25 : 23} color={color} />,
    })}>
      <Tabs.Screen name="index" options={{ title: "الرئيسية" }} />
      <Tabs.Screen name="study" options={{ title: "دراستي" }} />
      <Tabs.Screen name="library" options={{ title: "المكتبة" }} />
      <Tabs.Screen name="settings" options={{ title: "الإعدادات" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: "#FFFFFF", borderTopColor: "#E2E8F0", borderTopWidth: 1, paddingTop: 7 },
  tabLabel: { fontSize: 11, fontWeight: "700" },
});
