import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { appTheme } from "@/lib/app-theme";
import { useAppLock } from "@/lib/app-lock";

export function AppLockGate({ children }: { children: React.ReactNode }) {
  const { loading, enabled, locked, unlock } = useAppLock();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!loading && (!enabled || !locked)) return <>{children}</>;
  const attemptUnlock = async () => {
    setBusy(true);
    setFailed(false);
    const success = await unlock();
    setFailed(!success);
    setBusy(false);
  };
  return <View style={styles.container}><View style={styles.card}><View style={styles.icon}><MaterialIcons name="lock" size={32} color={appTheme.primary} /></View><Text style={styles.title}>{loading ? "يجري تجهيز الحماية" : "مُحاضِر مقفل"}</Text><Text style={styles.description}>{loading ? "نراجع إعدادات الخصوصية المحلية." : "استخدم البصمة أو رمز قفل جهازك لفتح محاضراتك."}</Text>{loading ? <ActivityIndicator color={appTheme.primary} /> : <Pressable onPress={() => void attemptUnlock()} disabled={busy} accessibilityRole="button" accessibilityLabel="فتح التطبيق" style={[styles.button, busy && styles.disabled]}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <><MaterialIcons name="fingerprint" size={21} color="#FFFFFF" /><Text style={styles.buttonText}>فتح التطبيق</Text></>}</Pressable>}{failed ? <Text style={styles.error}>لم يكتمل التحقق. حاول مرة أخرى.</Text> : null}</View></View>;
}

const styles = StyleSheet.create({ container: { alignItems: "center", backgroundColor: appTheme.background, flex: 1, justifyContent: "center", padding: 24 }, card: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 26, borderWidth: 1, gap: 13, maxWidth: 390, padding: 28, width: "100%" }, icon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 20, height: 68, justifyContent: "center", width: 68 }, title: { color: appTheme.ink, fontSize: 22, fontWeight: "800" }, description: { color: appTheme.muted, fontSize: 13, lineHeight: 21, textAlign: "center" }, button: { alignItems: "center", backgroundColor: appTheme.primary, borderRadius: 14, flexDirection: "row-reverse", gap: 8, justifyContent: "center", marginTop: 8, minHeight: 50, width: "100%" }, buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" }, error: { color: appTheme.danger, fontSize: 12, textAlign: "center" }, disabled: { opacity: 0.55 } });
