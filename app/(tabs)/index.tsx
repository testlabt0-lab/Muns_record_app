import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader, EmptyState, LoadingView, PrimaryButton, StatusPill } from "@/components/study-ui";
import { ScreenContainer } from "@/components/screen-container";
import { appTheme } from "@/lib/app-theme";
import { useStudy } from "@/lib/study-context";
import { getFollowUpCalendar } from "@/lib/weekly-reflection-follow-up-calendar";
import { filterOpenFollowUpItems, getOpenFollowUpItems, type FollowUpPriorityFilter } from "@/lib/weekly-reflection-follow-up-list";
import type { FollowUpPriority, Lecture } from "@/lib/study-types";

const PRIORITY_FILTERS: { id: FollowUpPriorityFilter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "high", label: "عالية" },
  { id: "medium", label: "متوسطة" },
  { id: "low", label: "منخفضة" },
];

export default function HomeScreen() {
  const router = useRouter();
  const { hydrated, years, terms, subjects, lectures, weeklyReflections, getSubject } = useStudy();
  const [priorityFilter, setPriorityFilter] = useState<FollowUpPriorityFilter>("all");
  const activeYear = years.find((year) => year.isActive);
  const recent = lectures.slice(0, 5);
  const openFollowUps = useMemo(() => getOpenFollowUpItems(weeklyReflections ?? []), [weeklyReflections]);
  const visibleFollowUps = useMemo(() => filterOpenFollowUpItems(openFollowUps, priorityFilter), [openFollowUps, priorityFilter]);
  const followUpCalendar = useMemo(() => getFollowUpCalendar(openFollowUps), [openFollowUps]);

  if (!hydrated) return <ScreenContainer><LoadingView /></ScreenContainer>;

  const startRecording = () => {
    if (!subjects.length) { router.push("/study"); return; }
    router.push("/record");
  };

  return <ScreenContainer className="px-5">
    <AppHeader eyebrow={activeYear ? activeYear.title : "مرحباً بك"} title="مُحاضِر" />
    <FlatList
      data={recent}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={<>
        <View style={styles.hero}>
          <View style={styles.heroPattern}><MaterialIcons name="graphic-eq" size={46} color="#C7D2FE" /></View>
          <Text style={styles.heroEyebrow}>دفترك الدراسي الذكي</Text>
          <Text style={styles.heroTitle}>{activeYear ? "نظّم محاضرتك التالية" : "ابدأ بتنظيم دراستك"}</Text>
          <Text style={styles.heroCopy}>{activeYear ? "سجّل المحاضرة، ضعها في مكانها الصحيح، ثم حوّلها إلى نص وملخص." : "أنشئ سنتك الدراسية والمواد أولاً حتى تحفظ كل تسجيل في مكانه."}</Text>
          <PrimaryButton label={subjects.length ? "تسجيل محاضرة" : "إنشاء سنة دراسية"} icon={subjects.length ? "mic" : "add"} onPress={startRecording} />
        </View>
        <QuickLink icon="insights" tone="violet" title="موجز الأسبوع" description="المحاضرات والمراجعة والتخزين في صفحة واحدة" onPress={() => router.push("/weekly-summary")} />
        <QuickLink icon="assignment-late" tone="warning" title="متابعة المواد" description="تعرف على المواد التي تحتاج جلسة قصيرة الآن" onPress={() => router.push("/follow-up" as never)} />
        {openFollowUps.length ? <View style={styles.openFollowUps}>
          <View style={styles.openFollowUpsHeader}><Text style={styles.openFollowUpsTitle}>خطوات متابعة مفتوحة</Text><StatusPill label={`${visibleFollowUps.length}/${openFollowUps.length}`} tone="warning" /></View>
          <Text style={styles.weeklyText}>مرتبة بالمتأخر ثم الأقرب استحقاقاً والأولوية.</Text>
          <View style={styles.followUpFilters}>{PRIORITY_FILTERS.map((filter) => <Pressable key={filter.id} onPress={() => setPriorityFilter(filter.id)} style={[styles.followUpFilter, priorityFilter === filter.id && styles.followUpFilterActive]}><Text style={[styles.followUpFilterText, priorityFilter === filter.id && styles.followUpFilterTextActive]}>{filter.label}</Text></Pressable>)}</View>
          {visibleFollowUps.length ? visibleFollowUps.slice(0, 3).map((item) => <Pressable key={item.weekStart} onPress={() => router.push("/weekly-summary")} style={({ pressed }) => [styles.openFollowUpRow, pressed && styles.pressed]}><View style={styles.openFollowUpCopy}><Text style={styles.openFollowUpTitle} numberOfLines={1}>{item.followUpGoal}</Text><Text style={styles.openFollowUpMeta}>{formatFollowUpMeta(item.followUpPriority, item.followUpDueAt, item.isOverdue)}{item.followUpSubjectId ? ` · ${getSubject(item.followUpSubjectId)?.title ?? "مادة"}` : ""}</Text></View><StatusPill label={priorityLabel(item.followUpPriority)} tone={item.followUpPriority === "high" ? "warning" : "primary"} /><MaterialIcons name="chevron-left" size={18} color={appTheme.violet} /></Pressable>) : <Text style={styles.noFollowUpFilter}>لا توجد خطوات ضمن هذه الأولوية.</Text>}
          <Text style={styles.calendarTitle}>استحقاقات الأيام السبعة القادمة</Text>
          <View style={styles.followUpCalendar}>{followUpCalendar.map((day) => <View key={day.date} style={styles.calendarDay}><Text style={styles.calendarDayLabel}>{day.label}</Text>{day.items.length ? day.items.slice(0, 2).map((item) => <Pressable key={item.weekStart} onPress={() => router.push("/weekly-summary")} style={styles.calendarItem}><Text style={styles.calendarItemText} numberOfLines={1}>{item.followUpGoal}</Text><Text style={styles.calendarItemMeta}>{item.followUpSubjectId ? getSubject(item.followUpSubjectId)?.title ?? "مادة" : priorityLabel(item.followUpPriority)}</Text></Pressable>) : <Text style={styles.calendarEmpty}>—</Text>}{day.items.length > 2 ? <Text style={styles.calendarMore}>+{day.items.length - 2}</Text> : null}</View>)}</View>
          <Pressable onPress={() => router.push("/weekly-summary")} style={styles.openFollowUpsLink}><Text style={styles.openFollowUpsLinkText}>فتح أهداف المتابعة</Text></Pressable>
        </View> : null}
        <View style={styles.stats}><Stat icon="menu-book" value={subjects.length} label="مادة" /><Stat icon="graphic-eq" value={lectures.length} label="محاضرة" /><Stat icon="account-tree" value={terms.length} label="ترم" /></View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>آخر المحاضرات</Text>{lectures.length ? <StatusPill label={`${lectures.length} محفوظة`} tone="neutral" /> : null}</View>
      </>}
      renderItem={({ item }) => <RecentLecture lecture={item} subjectName={getSubject(item.subjectId)?.title ?? "مادة"} onPress={() => router.push({ pathname: "/lecture/[lectureId]", params: { lectureId: item.id } })} />}
      ListEmptyComponent={<EmptyState icon="mic-none" title="لا توجد محاضرات بعد" description="بعد إضافة المواد، استخدم زر التسجيل لحفظ أول محاضرة في القسم الصحيح." />}
    />
  </ScreenContainer>;
}

function QuickLink({ icon, tone, title, description, onPress }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; tone: "violet" | "warning"; title: string; description: string; onPress: () => void }) { const color = tone === "violet" ? appTheme.violet : appTheme.warning; return <Pressable onPress={onPress} style={({ pressed }) => [tone === "violet" ? styles.weeklyButton : styles.followUpButton, pressed && styles.pressed]}><MaterialIcons name={icon} size={21} color={color} /><View style={styles.weeklyCopy}><Text style={[styles.quickLinkTitle, { color }]}>{title}</Text><Text style={styles.weeklyText}>{description}</Text></View><MaterialIcons name="chevron-left" size={20} color={color} /></Pressable>; }
function Stat({ icon, value, label }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; value: number; label: string }) { return <View style={styles.stat}><MaterialIcons name={icon} size={20} color={appTheme.primary} /><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function priorityLabel(priority?: FollowUpPriority) { return priority === "high" ? "عالية" : priority === "low" ? "منخفضة" : "متوسطة"; }
function formatFollowUpMeta(priority: FollowUpPriority | undefined, dueAt: string | undefined, isOverdue: boolean) { if (isOverdue) return `متأخر · ${priorityLabel(priority)}`; return dueAt ? `استحقاق ${new Date(`${dueAt}T00:00:00`).toLocaleDateString("ar", { month: "short", day: "numeric" })} · ${priorityLabel(priority)}` : `بلا تاريخ · ${priorityLabel(priority)}`; }
function RecentLecture({ lecture, subjectName, onPress }: { lecture: Lecture; subjectName: string; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.recentRow, pressed && styles.pressed]}><View style={styles.recentIcon}><MaterialIcons name="graphic-eq" size={21} color={appTheme.primary} /></View><View style={styles.recentText}><Text style={styles.recentTitle} numberOfLines={1}>{lecture.title}</Text><Text style={styles.recentMeta}>{subjectName} · {lecture.section === "theory" ? "نظري" : "عملي"}</Text></View><MaterialIcons name="chevron-left" size={22} color="#94A3B8" /></Pressable>; }

const styles = StyleSheet.create({
  list: { gap: 10, paddingBottom: 26 }, hero: { backgroundColor: appTheme.ink, borderRadius: 26, marginBottom: 16, overflow: "hidden", padding: 22 }, heroPattern: { left: 15, position: "absolute", top: 14 }, heroEyebrow: { color: "#C7D2FE", fontSize: 12, fontWeight: "800", textAlign: "right" }, heroTitle: { color: "#FFFFFF", fontSize: 25, fontWeight: "800", marginTop: 7, textAlign: "right" }, heroCopy: { color: "#CBD5E1", fontSize: 13, lineHeight: 20, marginBottom: 19, marginTop: 7, textAlign: "right" }, weeklyButton: { alignItems: "center", backgroundColor: "#F5F3FF", borderColor: "#DDD6FE", borderRadius: 17, borderWidth: 1, flexDirection: "row-reverse", gap: 10, marginBottom: 12, padding: 13 }, followUpButton: { alignItems: "center", backgroundColor: "#FFFBEB", borderColor: "#FDE68A", borderRadius: 17, borderWidth: 1, flexDirection: "row-reverse", gap: 10, marginBottom: 12, padding: 13 }, weeklyCopy: { flex: 1 }, quickLinkTitle: { fontSize: 14, fontWeight: "800", textAlign: "right" }, weeklyText: { color: appTheme.muted, fontSize: 11, marginTop: 3, textAlign: "right" }, openFollowUps: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0", borderRadius: 17, borderWidth: 1, gap: 9, marginBottom: 14, padding: 13 }, openFollowUpsHeader: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" }, openFollowUpsTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, followUpFilters: { flexDirection: "row-reverse", gap: 5 }, followUpFilter: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#BBF7D0", borderRadius: 99, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 30 }, followUpFilterActive: { backgroundColor: appTheme.success, borderColor: appTheme.success }, followUpFilterText: { color: appTheme.success, fontSize: 10, fontWeight: "800" }, followUpFilterTextActive: { color: "#FFFFFF" }, noFollowUpFilter: { color: appTheme.muted, fontSize: 11, paddingVertical: 8, textAlign: "right" }, openFollowUpRow: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 11, flexDirection: "row-reverse", gap: 8, padding: 10 }, openFollowUpCopy: { flex: 1 }, openFollowUpTitle: { color: appTheme.ink, fontSize: 12, fontWeight: "800", textAlign: "right" }, openFollowUpMeta: { color: appTheme.muted, fontSize: 10, marginTop: 3, textAlign: "right" }, calendarTitle: { color: appTheme.ink, fontSize: 11, fontWeight: "800", marginTop: 3, textAlign: "right" }, followUpCalendar: { flexDirection: "row-reverse", gap: 4 }, calendarDay: { backgroundColor: "#FFFFFF", borderColor: "#DCFCE7", borderRadius: 9, borderWidth: 1, flex: 1, minHeight: 76, padding: 4 }, calendarDayLabel: { color: appTheme.success, fontSize: 8, fontWeight: "800", textAlign: "center" }, calendarItem: { backgroundColor: "#ECFDF5", borderRadius: 5, marginTop: 4, padding: 3 }, calendarItemText: { color: appTheme.ink, fontSize: 7, fontWeight: "800", textAlign: "right" }, calendarItemMeta: { color: appTheme.muted, fontSize: 6, marginTop: 1, textAlign: "right" }, calendarEmpty: { color: "#CBD5E1", fontSize: 10, marginTop: 18, textAlign: "center" }, calendarMore: { color: appTheme.success, fontSize: 7, fontWeight: "800", marginTop: 3, textAlign: "center" }, openFollowUpsLink: { alignItems: "center", paddingVertical: 3 }, openFollowUpsLinkText: { color: appTheme.success, fontSize: 11, fontWeight: "800" }, stats: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 19, borderWidth: 1, flexDirection: "row-reverse", justifyContent: "space-around", marginBottom: 22, paddingVertical: 14 }, stat: { alignItems: "center", gap: 3, minWidth: 64 }, statValue: { color: appTheme.ink, fontSize: 18, fontWeight: "800" }, statLabel: { color: appTheme.muted, fontSize: 11, fontWeight: "700" }, sectionHeader: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 2 }, sectionTitle: { color: appTheme.ink, fontSize: 19, fontWeight: "800" }, recentRow: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 17, borderWidth: 1, flexDirection: "row-reverse", gap: 11, padding: 13 }, recentIcon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 13, height: 42, justifyContent: "center", width: 42 }, recentText: { flex: 1 }, recentTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, recentMeta: { color: appTheme.muted, fontSize: 12, marginTop: 3, textAlign: "right" }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
});
