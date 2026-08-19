import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader, EmptyState, IconButton, LoadingView, StatusPill } from "@/components/study-ui";
import { appTheme } from "@/lib/app-theme";
import { useStudy } from "@/lib/study-context";
import type { TermKind } from "@/lib/study-types";
import { ScreenContainer } from "@/components/screen-container";

export default function YearDetailScreen() {
  const router = useRouter();
  const { yearId } = useLocalSearchParams<{ yearId: string }>();
  const { hydrated, getYear, getTermForYear, addTerm, subjects } = useStudy();
  if (!hydrated) return <ScreenContainer><LoadingView /></ScreenContainer>;
  const year = getYear(yearId);
  if (!year) return <ScreenContainer className="p-5"><AppHeader title="السنة الدراسية" action={<IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} />} /><EmptyState icon="error-outline" title="لم نجد هذه السنة" description="ارجع إلى قائمة السنوات واختر سنة صالحة." /></ScreenContainer>;
  const openTerm = (kind: TermKind) => {
    const termId = getTermForYear(year.id, kind)?.id ?? addTerm(year.id, kind);
    router.push({ pathname: "/term/[termId]", params: { termId } });
  };
  return (
    <ScreenContainer className="px-5">
      <AppHeader eyebrow="السنة الدراسية" title={year.title} action={<IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} tone="neutral" />} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.info}><View style={styles.infoIcon}><MaterialIcons name="account-tree" size={24} color={appTheme.primary} /></View><View style={styles.infoCopy}><Text style={styles.infoTitle}>رتّب خطتك على ترمين</Text><Text style={styles.infoBody}>داخل كل ترم أضف المواد، ثم حدّد إن كانت المادة تشمل جانباً عملياً.</Text></View>{year.isActive ? <StatusPill label="نشطة" tone="success" /> : null}</View>
        <TermCard title="الترم الأول" subtitle="المواد والمحاضرات الأولى" icon="filter-1" subjectCount={subjects.filter((subject) => subject.termId === getTermForYear(year.id, "first")?.id).length} ready={Boolean(getTermForYear(year.id, "first"))} onPress={() => openTerm("first")} />
        <TermCard title="الترم الثاني" subtitle="المواد والمحاضرات الثانية" icon="filter-2" subjectCount={subjects.filter((subject) => subject.termId === getTermForYear(year.id, "second")?.id).length} ready={Boolean(getTermForYear(year.id, "second"))} onPress={() => openTerm("second")} />
        <View style={styles.note}><MaterialIcons name="info-outline" size={18} color={appTheme.muted} /><Text style={styles.noteText}>اضغط على أي ترم لفتحه أو إنشائه مباشرة.</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

function TermCard({ title, subtitle, icon, subjectCount, ready, onPress }: { title: string; subtitle: string; icon: React.ComponentProps<typeof MaterialIcons>["name"]; subjectCount: number; ready: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.termCard, pressed && styles.pressed]}><View style={styles.termIcon}><MaterialIcons name={icon} size={27} color={appTheme.primary} /></View><View style={styles.termText}><Text style={styles.termTitle}>{title}</Text><Text style={styles.termSubtitle}>{ready ? `${subjectCount} مادة داخل هذا الترم` : subtitle}</Text></View><MaterialIcons name="chevron-left" size={24} color="#94A3B8" /></Pressable>;
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 32 },
  info: { alignItems: "flex-start", backgroundColor: appTheme.primarySoft, borderRadius: 20, flexDirection: "row-reverse", gap: 12, padding: 16 }, infoIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, height: 42, justifyContent: "center", width: 42 }, infoCopy: { flex: 1 }, infoTitle: { color: appTheme.ink, fontSize: 15, fontWeight: "800", textAlign: "right" }, infoBody: { color: appTheme.muted, fontSize: 12, lineHeight: 18, marginTop: 4, textAlign: "right" },
  termCard: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 22, borderWidth: 1, flexDirection: "row-reverse", gap: 14, padding: 18 }, termIcon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 15, height: 50, justifyContent: "center", width: 50 }, termText: { flex: 1 }, termTitle: { color: appTheme.ink, fontSize: 18, fontWeight: "800", textAlign: "right" }, termSubtitle: { color: appTheme.muted, fontSize: 12, marginTop: 4, textAlign: "right" },
  note: { alignItems: "center", flexDirection: "row-reverse", gap: 8, justifyContent: "center", marginTop: 4 }, noteText: { color: appTheme.muted, fontSize: 12 }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
});
