import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppHeader, EmptyState, LoadingView, StatusPill } from "@/components/study-ui";
import { appTheme } from "@/lib/app-theme";
import { useStudy } from "@/lib/study-context";
import { ScreenContainer } from "@/components/screen-container";

export default function LibraryScreen() {
  const router = useRouter();
  const { hydrated, lectures, getSubject } = useStudy();
  const [query, setQuery] = useState("");
  if (!hydrated) return <ScreenContainer><LoadingView /></ScreenContainer>;
  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(() => lectures.filter((lecture) => !normalizedQuery || [lecture.title, lecture.transcript, getSubject(lecture.subjectId)?.title].filter(Boolean).some((value) => value?.toLowerCase().includes(normalizedQuery))), [getSubject, lectures, normalizedQuery]);
  return <ScreenContainer className="px-5"><AppHeader eyebrow="كل ما سجلته" title="المكتبة" /><View style={styles.search}><MaterialIcons name="search" size={22} color={appTheme.muted} /><TextInput value={query} onChangeText={setQuery} style={styles.searchInput} placeholder="ابحث في العناوين والنصوص" placeholderTextColor="#94A3B8" textAlign="right" returnKeyType="search" /></View><FlatList data={results} keyExtractor={(item) => item.id} contentContainerStyle={results.length ? styles.list : styles.emptyList} renderItem={({ item }) => <Pressable onPress={() => router.push({ pathname: "/lecture/[lectureId]", params: { lectureId: item.id } })} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.rowIcon}><MaterialIcons name={item.transcript ? "text-snippet" : "graphic-eq"} size={21} color={appTheme.primary} /></View><View style={styles.rowText}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.rowMeta}>{getSubject(item.subjectId)?.title ?? "مادة"} · {item.section === "theory" ? "نظري" : "عملي"}</Text></View>{item.summary ? <StatusPill label="ملخص" tone="success" /> : null}</Pressable>} ListEmptyComponent={<EmptyState icon="manage-search" title={query ? "لا توجد نتائج" : "مكتبتك فارغة"} description={query ? "جرّب كلمة مختلفة من عنوان المحاضرة أو نصها." : "ستظهر هنا المحاضرات التي تسجلها وتصنيفاتها ونصوصها."} />} /></ScreenContainer>;
}
const styles = StyleSheet.create({ search: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", gap: 10, marginBottom: 16, paddingHorizontal: 13 }, searchInput: { color: appTheme.ink, flex: 1, fontSize: 15, minHeight: 49 }, list: { gap: 10, paddingBottom: 24 }, emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 30 }, row: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 17, borderWidth: 1, flexDirection: "row-reverse", gap: 11, padding: 13 }, rowIcon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 13, height: 42, justifyContent: "center", width: 42 }, rowText: { flex: 1 }, rowTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, rowMeta: { color: appTheme.muted, fontSize: 12, marginTop: 4, textAlign: "right" }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] } });
