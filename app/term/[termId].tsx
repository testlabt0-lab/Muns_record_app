import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { SubjectForm } from "@/components/study-forms";
import { AppHeader, EmptyState, IconButton, LoadingView, PrimaryButton, StatusPill } from "@/components/study-ui";
import { appTheme } from "@/lib/app-theme";
import { useStudy } from "@/lib/study-context";
import type { Subject } from "@/lib/study-types";
import { ScreenContainer } from "@/components/screen-container";

export default function TermDetailScreen() {
  const router = useRouter();
  const { termId } = useLocalSearchParams<{ termId: string }>();
  const { hydrated, getTerm, getYear, subjects, lectures, addSubject } = useStudy();
  const [creating, setCreating] = useState(false);
  if (!hydrated) return <ScreenContainer><LoadingView /></ScreenContainer>;
  const term = getTerm(termId);
  const year = term ? getYear(term.yearId) : undefined;
  if (!term) return <ScreenContainer className="p-5"><AppHeader title="الترم" action={<IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} />} /><EmptyState icon="error-outline" title="لم نجد هذا الترم" description="ارجع إلى السنة الدراسية وأنشئ الترم من هناك." /></ScreenContainer>;
  const termSubjects = subjects.filter((subject) => subject.termId === term.id);
  const createSubject = (input: Parameters<typeof addSubject>[1]) => {
    try { const subjectId = addSubject(term.id, input); setCreating(false); router.push({ pathname: "/subject/[subjectId]", params: { subjectId } }); }
    catch (error) { Alert.alert("تحقق من البيانات", error instanceof Error ? error.message : "تعذر حفظ المادة."); }
  };
  return (
    <ScreenContainer className="px-5">
      <AppHeader eyebrow={year?.title ?? "سنة دراسية"} title={term.title} action={<IconButton icon="add" label="إضافة مادة" onPress={() => setCreating(true)} />} />
      <FlatList data={termSubjects} keyExtractor={(item) => item.id} contentContainerStyle={termSubjects.length ? styles.list : styles.emptyList} renderItem={({ item }) => <SubjectCard subject={item} lectureCount={lectures.filter((lecture) => lecture.subjectId === item.id).length} onPress={() => router.push({ pathname: "/subject/[subjectId]", params: { subjectId: item.id } })} />} ListEmptyComponent={<EmptyState icon="menu-book" title="أضف أول مادة" description="عند إضافة مادة عملية ستتمكن من حفظ محاضرات النظري والعملي في مسارين منفصلين." action={<PrimaryButton label="إضافة مادة" onPress={() => setCreating(true)} />} />} />
      <SubjectForm visible={creating} onClose={() => setCreating(false)} onSubmit={createSubject} />
    </ScreenContainer>
  );
}

function SubjectCard({ subject, lectureCount, onPress }: { subject: Subject; lectureCount: number; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.subjectCard, pressed && styles.pressed]}><View style={[styles.subjectStripe, { backgroundColor: subject.color }]} /><View style={styles.subjectContent}><View style={styles.subjectTop}><View style={styles.subjectKind}>{subject.hasPracticalSection ? <StatusPill label="نظري + عملي" tone="primary" /> : <StatusPill label="نظري" tone="neutral" />}</View><Text style={styles.subjectTitle}>{subject.title}</Text></View><View style={styles.teacherRow}><MaterialIcons name="person-outline" size={16} color={appTheme.muted} /><Text style={styles.teacher}>{subject.theoryInstructor}</Text><Text style={styles.meta}>· {lectureCount} محاضرة</Text></View></View><MaterialIcons name="chevron-left" size={23} color="#94A3B8" /></Pressable>;
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingBottom: 24 }, emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 28 },
  subjectCard: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 20, borderWidth: 1, flexDirection: "row-reverse", minHeight: 98, overflow: "hidden" }, subjectStripe: { alignSelf: "stretch", width: 6 }, subjectContent: { flex: 1, paddingHorizontal: 14, paddingVertical: 15 }, subjectTop: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" }, subjectKind: { marginLeft: 10 }, subjectTitle: { color: appTheme.ink, flex: 1, fontSize: 17, fontWeight: "800", textAlign: "right" }, teacherRow: { alignItems: "center", flexDirection: "row-reverse", gap: 4, marginTop: 11 }, teacher: { color: appTheme.muted, fontSize: 12, fontWeight: "600" }, meta: { color: "#94A3B8", fontSize: 12 }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
});
