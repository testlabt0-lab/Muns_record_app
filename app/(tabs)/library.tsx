import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppHeader, EmptyState, LoadingView, StatusPill } from "@/components/study-ui";
import { ScreenContainer } from "@/components/screen-container";
import { appTheme } from "@/lib/app-theme";
import { useStudy } from "@/lib/study-context";

export default function LibraryScreen() {
  const router = useRouter();
  const { hydrated, lectures, getSubject } = useStudy();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "transcribed" | "summarized">("all");
  const normalizedQuery = query.trim().toLocaleLowerCase("ar");
  const results = useMemo(() => lectures.filter((lecture) => {
    const subject = getSubject(lecture.subjectId);
    const searchText = [
      lecture.title,
      lecture.transcript,
      lecture.summary?.overview,
      ...(lecture.summary?.keyPoints ?? []),
      ...(lecture.summary?.terms ?? []),
      ...(lecture.summary?.reviewQuestions ?? []),
      subject?.title,
      subject?.theoryInstructor,
      subject?.practicalInstructor,
      ...(lecture.attachments ?? []).map((attachment) => attachment.title),
    ].filter(Boolean).join(" ").toLocaleLowerCase("ar");
    const matchesFilter = filter === "all" || (filter === "transcribed" ? Boolean(lecture.transcript) : Boolean(lecture.summary));
    return matchesFilter && (!normalizedQuery || searchText.includes(normalizedQuery));
  }), [filter, getSubject, lectures, normalizedQuery]);

  if (!hydrated) return <ScreenContainer><LoadingView /></ScreenContainer>;
  return <ScreenContainer className="px-5">
    <AppHeader eyebrow="كل ما سجلته" title="المكتبة" />
    <View style={styles.search}>
      <MaterialIcons name="search" size={22} color={appTheme.muted} />
      <TextInput value={query} onChangeText={setQuery} style={styles.searchInput} placeholder="ابحث في المحاضرات والملخصات" placeholderTextColor="#94A3B8" textAlign="right" returnKeyType="search" accessibilityLabel="البحث في المكتبة" />
    </View>
    <View style={styles.filters}>
      {(["all", "transcribed", "summarized"] as const).map((value) => <Pressable key={value} onPress={() => setFilter(value)} accessibilityRole="button" accessibilityState={{ selected: filter === value }} style={[styles.filterChip, filter === value && styles.filterChipActive]}><Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{value === "all" ? "الكل" : value === "transcribed" ? "بها نص" : "بها ملخص"}</Text></Pressable>)}
    </View>
    <FlatList data={results} keyExtractor={(item) => item.id} contentContainerStyle={results.length ? styles.list : styles.emptyList} renderItem={({ item }) => <Pressable onPress={() => router.push({ pathname: "/lecture/[lectureId]", params: { lectureId: item.id } })} accessibilityRole="button" accessibilityLabel={`فتح ${item.title}`} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.rowIcon}><MaterialIcons name={item.transcript ? "text-snippet" : "graphic-eq"} size={21} color={appTheme.primary} /></View><View style={styles.rowText}><Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.rowMeta}>{getSubject(item.subjectId)?.title ?? "مادة"} · {item.section === "theory" ? "نظري" : "عملي"} · {new Date(item.recordedAt).toLocaleDateString("ar")}</Text><Text style={styles.rowHint} numberOfLines={1}>{item.summary?.overview ?? item.transcript?.slice(0, 100) ?? `${(item.attachments ?? []).length} مرفق`}</Text></View>{item.summary ? <StatusPill label="ملخص" tone="success" /> : item.transcript ? <StatusPill label="نص" tone="neutral" /> : null}</Pressable>} ListEmptyComponent={<EmptyState icon="manage-search" title={query || filter !== "all" ? "لا توجد نتائج" : "مكتبتك فارغة"} description={query || filter !== "all" ? "جرّب كلمة مختلفة أو غيّر المرشح." : "ستظهر هنا المحاضرات التي تسجلها وتصنيفاتها ونصوصها."} />} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({ search: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", gap: 10, marginBottom: 10, paddingHorizontal: 13 }, searchInput: { color: appTheme.ink, flex: 1, fontSize: 15, minHeight: 49 }, filters: { flexDirection: "row-reverse", gap: 8, marginBottom: 14 }, filterChip: { backgroundColor: "#F1F5F9", borderRadius: 99, paddingHorizontal: 13, paddingVertical: 8 }, filterChipActive: { backgroundColor: appTheme.primarySoft }, filterText: { color: appTheme.muted, fontSize: 12, fontWeight: "800" }, filterTextActive: { color: appTheme.primary }, list: { gap: 10, paddingBottom: 24 }, emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 30 }, row: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 17, borderWidth: 1, flexDirection: "row-reverse", gap: 11, padding: 13 }, rowIcon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 13, height: 42, justifyContent: "center", width: 42 }, rowText: { flex: 1 }, rowTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, rowMeta: { color: appTheme.muted, fontSize: 12, marginTop: 4, textAlign: "right" }, rowHint: { color: appTheme.muted, fontSize: 11, marginTop: 3, textAlign: "right" }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] } });
