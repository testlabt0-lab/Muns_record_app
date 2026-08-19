import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { YearForm } from "@/components/study-forms";
import { AppHeader, EmptyState, IconButton, LoadingView, PrimaryButton, StatusPill } from "@/components/study-ui";
import { appTheme } from "@/lib/app-theme";
import { useStudy } from "@/lib/study-context";
import type { AcademicYear } from "@/lib/study-types";
import { ScreenContainer } from "@/components/screen-container";

export default function StudyScreen() {
  const router = useRouter();
  const { years, hydrated, addYear, terms, subjects } = useStudy();
  const [creating, setCreating] = useState(false);
  if (!hydrated) return <ScreenContainer><LoadingView /></ScreenContainer>;

  const createYear = (title: string) => {
    try {
      const yearId = addYear(title);
      setCreating(false);
      router.push({ pathname: "/year/[yearId]", params: { yearId } });
    } catch (error) { Alert.alert("تحقق من البيانات", error instanceof Error ? error.message : "تعذر إنشاء السنة."); }
  };

  return (
    <ScreenContainer className="px-5">
      <AppHeader eyebrow="تنظيم واضح من البداية" title="دراستي" action={<IconButton icon="add" label="إضافة سنة" onPress={() => setCreating(true)} />} />
      <FlatList
        data={years.slice().sort((a, b) => Number(b.isActive) - Number(a.isActive))}
        keyExtractor={(item) => item.id}
        contentContainerStyle={years.length ? styles.list : styles.emptyList}
        renderItem={({ item }) => <YearCard year={item} termsCount={terms.filter((term) => term.yearId === item.id).length} subjectsCount={subjects.filter((subject) => terms.some((term) => term.id === subject.termId && term.yearId === item.id)).length} onPress={() => router.push({ pathname: "/year/[yearId]", params: { yearId: item.id } })} />}
        ListEmptyComponent={<EmptyState icon="school" title="ابدأ بسنتك الدراسية" description="أنشئ السنة أولاً، ثم أضف الترم الأول أو الثاني والمواد التي تدرسها." action={<PrimaryButton label="إنشاء سنة دراسية" onPress={() => setCreating(true)} />} />}
      />
      <YearForm visible={creating} onClose={() => setCreating(false)} onSubmit={createYear} />
    </ScreenContainer>
  );
}

function YearCard({ year, termsCount, subjectsCount, onPress }: { year: AcademicYear; termsCount: number; subjectsCount: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.yearCard, pressed && styles.pressed]}>
      <View style={styles.yearTop}><View style={styles.yearIcon}><MaterialIcons name="calendar-month" size={25} color={appTheme.primary} /></View><View style={styles.yearStatus}>{year.isActive ? <StatusPill label="السنة النشطة" tone="success" /> : null}</View></View>
      <Text style={styles.yearTitle}>{year.title}</Text>
      <View style={styles.yearMeta}><Text style={styles.metaText}>{termsCount} ترم</Text><View style={styles.dot} /><Text style={styles.metaText}>{subjectsCount} مادة</Text><MaterialIcons name="chevron-left" size={21} color="#94A3B8" /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingBottom: 24 }, emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 28 },
  yearCard: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 22, borderWidth: 1, padding: 18 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  yearTop: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" }, yearIcon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 15, height: 48, justifyContent: "center", width: 48 }, yearStatus: { alignItems: "flex-end" },
  yearTitle: { color: appTheme.ink, fontSize: 20, fontWeight: "800", marginTop: 18, textAlign: "right" },
  yearMeta: { alignItems: "center", flexDirection: "row-reverse", gap: 7, marginTop: 8 }, metaText: { color: appTheme.muted, fontSize: 13, fontWeight: "600" }, dot: { backgroundColor: "#CBD5E1", borderRadius: 3, height: 4, width: 4 },
});
