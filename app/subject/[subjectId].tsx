import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader, EmptyState, IconButton, LoadingView, PrimaryButton, StatusPill } from "@/components/study-ui";
import { appTheme } from "@/lib/app-theme";
import { useStudy } from "@/lib/study-context";
import type { Lecture, SubjectSection } from "@/lib/study-types";
import { ScreenContainer } from "@/components/screen-container";

export default function SubjectDetailScreen() {
  const router = useRouter();
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const { hydrated, getSubject, getLecturesForSubject } = useStudy();
  const [section, setSection] = useState<SubjectSection>("theory");
  if (!hydrated) return <ScreenContainer><LoadingView /></ScreenContainer>;
  const subject = getSubject(subjectId);
  if (!subject) return <ScreenContainer className="p-5"><AppHeader title="المادة" action={<IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} />} /><EmptyState icon="error-outline" title="لم نجد هذه المادة" description="ارجع إلى قائمة المواد واختر مادة متاحة." /></ScreenContainer>;
  const visibleLectures = getLecturesForSubject(subject.id, section);
  const instructor = section === "practical" ? subject.practicalInstructor : subject.theoryInstructor;
  return (
    <ScreenContainer className="px-5">
      <AppHeader eyebrow={section === "theory" ? "القسم النظري" : "القسم العملي"} title={subject.title} action={<IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} tone="neutral" />} />
      <View style={[styles.subjectBanner, { borderRightColor: subject.color }]}><View style={styles.bannerHead}><StatusPill label={subject.hasPracticalSection ? "مادة ذات جانب عملي" : "مادة نظرية"} tone="primary" /><Text style={styles.instructor}><MaterialIcons name="person-outline" size={16} color={appTheme.muted} />  {instructor}</Text></View><Text style={styles.bannerText}>كل محاضرات هذا القسم محفوظة ومنفصلة عن القسم الآخر.</Text></View>
      {subject.hasPracticalSection ? <View style={styles.segmented}><SectionTab label="نظري" active={section === "theory"} onPress={() => setSection("theory")} /><SectionTab label="عملي" active={section === "practical"} onPress={() => setSection("practical")} /></View> : null}
      <FlatList data={visibleLectures} keyExtractor={(item) => item.id} contentContainerStyle={visibleLectures.length ? styles.list : styles.emptyList} renderItem={({ item }) => <LectureRow lecture={item} onPress={() => router.push({ pathname: "/lecture/[lectureId]", params: { lectureId: item.id } })} />} ListEmptyComponent={<EmptyState icon="mic-none" title="لا توجد محاضرات في هذا القسم" description="سجّل محاضرتك التالية واختر هذا القسم لحفظها هنا." action={<PrimaryButton label="تسجيل محاضرة" icon="mic" onPress={() => router.push({ pathname: "/record", params: { subjectId: subject.id, section } })} />} />} />
      {visibleLectures.length ? <View style={styles.recordDock}><PrimaryButton label="تسجيل محاضرة" icon="mic" onPress={() => router.push({ pathname: "/record", params: { subjectId: subject.id, section } })} /></View> : null}
    </ScreenContainer>
  );
}

function SectionTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.sectionTab, active && styles.sectionTabActive]}><Text style={[styles.sectionText, active && styles.sectionTextActive]}>{label}</Text></Pressable>; }

function LectureRow({ lecture, onPress }: { lecture: Lecture; onPress: () => void }) { const date = new Date(lecture.recordedAt).toLocaleDateString("ar", { month: "short", day: "numeric" }); return <Pressable onPress={onPress} style={({ pressed }) => [styles.lectureRow, pressed && styles.pressed]}><View style={styles.lectureIcon}><MaterialIcons name="graphic-eq" size={22} color={appTheme.primary} /></View><View style={styles.lectureText}><Text style={styles.lectureTitle} numberOfLines={1}>{lecture.title}</Text><Text style={styles.lectureMeta}>{date} · {Math.max(1, Math.floor(lecture.durationSeconds / 60))} د</Text></View><MaterialIcons name="chevron-left" size={23} color="#94A3B8" /></Pressable>; }

const styles = StyleSheet.create({
  subjectBanner: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderRightWidth: 5, borderWidth: 1, marginBottom: 14, padding: 15 }, bannerHead: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" }, instructor: { color: appTheme.muted, fontSize: 13, fontWeight: "700", textAlign: "right" }, bannerText: { color: appTheme.muted, fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: "right" },
  segmented: { backgroundColor: "#E2E8F0", borderRadius: 14, flexDirection: "row-reverse", marginBottom: 14, padding: 4 }, sectionTab: { alignItems: "center", borderRadius: 10, flex: 1, minHeight: 39, justifyContent: "center" }, sectionTabActive: { backgroundColor: appTheme.surface }, sectionText: { color: appTheme.muted, fontSize: 14, fontWeight: "800" }, sectionTextActive: { color: appTheme.primary },
  list: { gap: 10, paddingBottom: 88 }, emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 36 }, lectureRow: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, flexDirection: "row-reverse", gap: 12, padding: 13 }, lectureIcon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 13, height: 43, justifyContent: "center", width: 43 }, lectureText: { flex: 1 }, lectureTitle: { color: appTheme.ink, fontSize: 15, fontWeight: "800", textAlign: "right" }, lectureMeta: { color: appTheme.muted, fontSize: 12, marginTop: 4, textAlign: "right" }, recordDock: { backgroundColor: appTheme.background, bottom: 0, left: 0, paddingBottom: 8, paddingHorizontal: 20, paddingTop: 10, position: "absolute", right: 0 }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
});
