import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { appTheme } from "@/lib/app-theme";

export function AppHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.heading}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

export function IconButton({ icon, label, onPress, tone = "primary" }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; onPress: () => void; tone?: "primary" | "neutral" | "danger" }) {
  const color = tone === "danger" ? appTheme.danger : tone === "neutral" ? appTheme.ink : appTheme.primary;
  const background = tone === "danger" ? appTheme.dangerSoft : tone === "neutral" ? "#F1F5F9" : appTheme.primarySoft;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, { backgroundColor: background }, pressed && styles.pressed]}>
      <MaterialIcons name={icon} size={22} color={color} />
    </Pressable>
  );
}

export function PrimaryButton({ label, icon = "add", onPress, disabled = false }: { label: string; icon?: React.ComponentProps<typeof MaterialIcons>["name"]; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.primaryButton, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      <MaterialIcons name={icon} size={20} color="#FFFFFF" />
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; description: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><MaterialIcons name={icon} size={30} color={appTheme.primary} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{description}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function LoadingView() {
  return <View style={styles.loading}><ActivityIndicator size="large" color={appTheme.primary} /><Text style={styles.loadingText}>يجري تجهيز دفترك الدراسي…</Text></View>;
}

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "primary" }) {
  const map = {
    neutral: { backgroundColor: "#F1F5F9", color: appTheme.muted },
    success: { backgroundColor: appTheme.successSoft, color: appTheme.success },
    warning: { backgroundColor: appTheme.warningSoft, color: appTheme.warning },
    primary: { backgroundColor: appTheme.primarySoft, color: appTheme.primary },
  } as const;
  return <View style={[styles.pill, { backgroundColor: map[tone].backgroundColor }]}><Text style={[styles.pillText, { color: map[tone].color }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 22 },
  heading: { flex: 1, alignItems: "flex-end" },
  eyebrow: { color: appTheme.primary, fontSize: 12, fontWeight: "700", marginBottom: 4 },
  title: { color: appTheme.ink, fontSize: 29, fontWeight: "800", letterSpacing: -0.6, textAlign: "right" },
  iconButton: { alignItems: "center", borderRadius: 18, height: 46, justifyContent: "center", marginLeft: 12, width: 46 },
  primaryButton: { alignItems: "center", backgroundColor: appTheme.primary, borderRadius: 16, flexDirection: "row-reverse", gap: 8, justifyContent: "center", minHeight: 52, paddingHorizontal: 18 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  empty: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 24, borderWidth: 1, marginTop: 20, padding: 28 },
  emptyIcon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 18, height: 58, justifyContent: "center", marginBottom: 16, width: 58 },
  emptyTitle: { color: appTheme.ink, fontSize: 18, fontWeight: "800", textAlign: "center" },
  emptyCopy: { color: appTheme.muted, fontSize: 14, lineHeight: 21, marginTop: 7, textAlign: "center" },
  emptyAction: { alignSelf: "stretch", marginTop: 20 },
  loading: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  loadingText: { color: appTheme.muted, fontSize: 14, marginTop: 12 },
  pill: { alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 12, fontWeight: "700" },
});
