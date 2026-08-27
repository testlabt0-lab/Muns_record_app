import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { AppHeader, EmptyState, LoadingView, StatusPill } from "@/components/study-ui";
import { ScreenContainer } from "@/components/screen-container";
import { appTheme } from "@/lib/app-theme";
import { useStudy } from "@/lib/study-context";
import { buildSubjectFollowUps, filterSubjectFollowUpsByTerm, type SubjectFollowUpStatus } from "@/lib/subject-follow-up";
import { createSubjectFollowUpReportHtml } from "@/lib/subject-follow-up-report";
import { createSubjectFollowUpShareText } from "@/lib/subject-follow-up-share";
import { buildTermProgressComparison, compareTermMetric } from "@/lib/term-progress-comparison";
import { buildFollowUpSubjectTimingInsights, formatFollowUpCompletionTime, type FollowUpSubjectTimingInsight } from "@/lib/weekly-reflection-follow-up-timing-insights";
import { createFollowUpTimingReportHtml } from "@/lib/weekly-reflection-follow-up-timing-report";

const statusLabel: Record<SubjectFollowUpStatus, string> = { critical: "يحتاج أولوية", attention: "يحتاج متابعة", "on-track": "ضمن المسار", unplanned: "بلا هدف" };
const statusTone: Record<SubjectFollowUpStatus, "warning" | "success" | "neutral"> = { critical: "warning", attention: "warning", "on-track": "success", unplanned: "neutral" };

export default function FollowUpScreen() {
  const router = useRouter();
  const { hydrated, subjects, terms, subjectGoals, lectures, reviewCards, reviewSessions, tasks, weeklyReflections, followUpActivities } = useStudy();
  const [termId, setTermId] = useState<string>();
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [exportingTiming, setExportingTiming] = useState(false);
  if (!hydrated) return <ScreenContainer><LoadingView /></ScreenContainer>;

  const allItems = buildSubjectFollowUps({ subjects, subjectGoals, lectures, reviewCards, reviewSessions, tasks });
  const items = filterSubjectFollowUpsByTerm(allItems, termId);
  const selectedSubjects = termId ? subjects.filter((subject) => subject.termId === termId) : subjects;
  const timingInsights = buildFollowUpSubjectTimingInsights(selectedSubjects, weeklyReflections ?? [], followUpActivities ?? []);
  const termComparison = buildTermProgressComparison(terms, subjects, lectures, reviewCards, reviewSessions ?? []);
  const needsAttention = items.filter((item) => item.status !== "on-track").length;
  const filterLabel = termId ? terms.find((term) => term.id === termId)?.title ?? "ترم محدد" : "كل الترمين";
  const visualComparison = items.filter((item) => item.goal).slice(0, 5);

  const exportReport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const html = createSubjectFollowUpReportHtml({ items, filterLabel });
      if (Platform.OS === "web") { await Print.printAsync({ html }); return; }
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf", dialogTitle: "مشاركة تقرير متابعة المواد" });
    } catch {
      Alert.alert("تعذر إنشاء التقرير", "حاول مرة أخرى بعد التحقق من مساحة الجهاز.");
    } finally { setExporting(false); }
  };
  const exportTimingReport = async () => {
    if (exportingTiming) return;
    setExportingTiming(true);
    try {
      const html = createFollowUpTimingReportHtml({ insights: timingInsights, filterLabel });
      if (Platform.OS === "web") { await Print.printAsync({ html }); return; }
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf", dialogTitle: "مشاركة تقرير وقت خطوات المتابعة" });
      else Alert.alert("التقرير جاهز", "أُنشئ ملف PDF محلياً، لكن المشاركة غير متاحة على هذا الجهاز.");
    } catch {
      Alert.alert("تعذر إنشاء التقرير", "حاول مرة أخرى بعد التحقق من مساحة الجهاز.");
    } finally { setExportingTiming(false); }
  };
  const shareSummary = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      if (!(await Sharing.isAvailableAsync())) { Alert.alert("المشاركة غير متاحة", "المشاركة غير متاحة على هذا الجهاز أو المتصفح."); return; }
      await Sharing.shareAsync(createSubjectFollowUpShareText({ items, filterLabel }), { dialogTitle: "مشاركة ملخص متابعة المواد" });
    } finally { setSharing(false); }
  };

  return <ScreenContainer className="px-5"><AppHeader eyebrow="ترتيب محلي بحسب فجوة الهدف" title="متابعة المواد" action={<Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>رجوع</Text></Pressable>} /><FlatList data={items} keyExtractor={(item) => item.subject.id} contentContainerStyle={styles.list} ListHeaderComponent={<>
    <View style={styles.summary}><View style={styles.summaryIcon}><Text style={styles.summaryNumber}>{needsAttention}</Text></View><View style={styles.copy}><Text style={styles.summaryTitle}>مواد تحتاج متابعة</Text><Text style={styles.summaryText}>ترتيب من الأقل تقدماً إلى الأقرب لإكمال هدف الترم. الحساب محلي من محاضراتك ومراجعتك وتركيزك.</Text></View></View>
    <TimingCard insights={timingInsights} filterLabel={filterLabel} exporting={exportingTiming} onExport={() => void exportTimingReport()} />
    {visualComparison.length > 1 ? <View style={styles.visualComparison}><Text style={styles.comparisonTitle}>مقارنة مرئية للمواد</Text>{visualComparison.map((item) => <View key={item.subject.id} style={styles.visualRow}><View style={[styles.visualDot, { backgroundColor: item.subject.color }]} /><Text style={styles.visualTitle} numberOfLines={1}>{item.subject.title}</Text><View style={styles.visualTrack}><View style={[styles.visualFill, { width: `${item.percent}%`, backgroundColor: item.subject.color }]} /></View><Text style={styles.visualPercent}>{item.percent}%</Text></View>)}</View> : null}
    {termComparison.length > 1 ? <View style={styles.comparison}><Text style={styles.comparisonTitle}>مقارنة الترمين</Text>{termComparison.slice(0, 2).map((item, index) => <View key={item.term.id} style={styles.comparisonRow}><Text style={styles.comparisonTerm}>{item.term.title}</Text><Text style={styles.comparisonMeta}>{item.lectureCount} محاضرة · {item.reviewedCardCount} بطاقة · {item.focusMinutes} د</Text>{index === 1 ? <Text style={styles.comparisonDelta}>{compareTermMetric(item.lectureCount, termComparison[0].lectureCount) >= 0 ? "+" : ""}{compareTermMetric(item.lectureCount, termComparison[0].lectureCount)} محاضرات مقابل {termComparison[0].term.title}</Text> : null}</View>)}</View> : null}
    {terms.length ? <View style={styles.termFilter}><Text style={styles.filterLabel}>الترم</Text><View style={styles.chips}><Pressable onPress={() => setTermId(undefined)} style={[styles.chip, !termId && styles.chipActive]}><Text style={[styles.chipText, !termId && styles.chipTextActive]}>الكل</Text></Pressable>{terms.map((term) => <Pressable key={term.id} onPress={() => setTermId(term.id)} style={[styles.chip, termId === term.id && styles.chipActive]}><Text style={[styles.chipText, termId === term.id && styles.chipTextActive]}>{term.title}</Text></Pressable>)}</View></View> : null}
    <View style={styles.actionRow}><Pressable disabled={exporting} onPress={() => void exportReport()} style={[styles.exportButton, exporting && styles.disabled]}><Text style={styles.exportText}>{exporting ? "يجري إنشاء التقرير" : "تصدير PDF"}</Text></Pressable><Pressable disabled={sharing} onPress={() => void shareSummary()} style={[styles.shareButton, sharing && styles.disabled]}><Text style={styles.shareText}>{sharing ? "يجري التحضير" : "مشاركة ملخص"}</Text></Pressable></View>
  </>} renderItem={({ item }) => <Pressable onPress={() => router.push({ pathname: "/subject/[subjectId]", params: { subjectId: item.subject.id } })} style={styles.card}><View style={[styles.colorDot, { backgroundColor: item.subject.color }]} /><View style={styles.copy}><View style={styles.cardHeader}><Text style={styles.subjectTitle}>{item.subject.title}</Text><StatusPill label={statusLabel[item.status]} tone={statusTone[item.status]} /></View><Text style={styles.reason}>{item.reason}</Text><View style={styles.track}><View style={[styles.fill, { width: `${item.percent}%` }]} /></View><Text style={styles.meta}>{item.goal ? `${item.percent}% من هدف الترم · ${item.progress.lectureCount} محاضرات · ${item.progress.focusMinutes} د تركيز` : "افتح المادة وحدد هدفاً قابلاً للقياس"}</Text></View></Pressable>} ListEmptyComponent={<EmptyState icon="insights" title={termId ? "لا مواد في هذا الترم" : "أضف موادك أولاً"} description={termId ? "اختر ترماً آخر أو أضف مادة لهذا الترم." : "ستظهر هنا قراءة محلية لمتابعة تقدم كل مادة."} />} /></ScreenContainer>;
}

function TimingCard({ insights, filterLabel, exporting, onExport }: { insights: FollowUpSubjectTimingInsight[]; filterLabel: string; exporting: boolean; onExport: () => void }) {
  return <View style={styles.timingCard}><Text style={styles.comparisonTitle}>وقت إنجاز خطوات المتابعة</Text><Text style={styles.timingHint}>يعتمد على النشاط المسجل بعد تفعيل الميزة، ولا يقدّر تواريخ قديمة غير محفوظة. نطاق التقرير: {filterLabel}.</Text>{insights.length ? insights.slice(0, 4).map((item) => <View key={item.subject.id} style={styles.timingRow}><View style={[styles.visualDot, { backgroundColor: item.subject.color }]} /><Text style={styles.timingTitle} numberOfLines={1}>{item.subject.title}</Text><Text style={styles.timingMetric}>إتمام {formatFollowUpCompletionTime(item.averageCompletionHours)}</Text><Text style={styles.timingMetric}>تأجيل {item.postponementCount}</Text></View>) : <Text style={styles.timingHint}>لا توجد بيانات زمنية مكتملة بعد؛ سيظهر التقرير فور تسجيل إتمام أو تأجيل مرتبط بمادة.</Text>}<Pressable disabled={exporting} onPress={onExport} style={[styles.timingExport, exporting && styles.disabled]}><Text style={styles.exportText}>{exporting ? "يجري إنشاء تقرير الوقت" : "تقرير وقت الخطوات PDF"}</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  list: { gap: 10, paddingBottom: 28 }, summary: { alignItems: "center", backgroundColor: "#F5F3FF", borderColor: "#DDD6FE", borderRadius: 19, borderWidth: 1, flexDirection: "row-reverse", gap: 12, marginBottom: 4, padding: 15 }, summaryIcon: { alignItems: "center", backgroundColor: appTheme.violet, borderRadius: 16, height: 50, justifyContent: "center", width: 50 }, summaryNumber: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" }, copy: { flex: 1 }, summaryTitle: { color: appTheme.ink, fontSize: 16, fontWeight: "800", textAlign: "right" }, summaryText: { color: appTheme.muted, fontSize: 11, lineHeight: 17, marginTop: 3, textAlign: "right" }, timingCard: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA", borderRadius: 15, borderWidth: 1, gap: 8, padding: 12 }, timingHint: { color: appTheme.muted, fontSize: 10, lineHeight: 15, textAlign: "right" }, timingRow: { alignItems: "center", borderTopColor: "#FED7AA", borderTopWidth: 1, flexDirection: "row-reverse", gap: 7, paddingTop: 7 }, timingTitle: { color: appTheme.ink, flex: 1, fontSize: 11, fontWeight: "800", textAlign: "right" }, timingMetric: { color: appTheme.primary, fontSize: 10, fontWeight: "700", textAlign: "left" }, timingExport: { alignItems: "center", backgroundColor: "#C2410C", borderRadius: 10, justifyContent: "center", minHeight: 38 }, visualComparison: { backgroundColor: "#F0FDFA", borderColor: "#99F6E4", borderRadius: 15, borderWidth: 1, gap: 8, padding: 12 }, visualRow: { alignItems: "center", flexDirection: "row-reverse", gap: 7 }, visualDot: { borderRadius: 99, height: 9, width: 9 }, visualTitle: { color: appTheme.ink, fontSize: 10, fontWeight: "800", maxWidth: 76, textAlign: "right", width: 76 }, visualTrack: { backgroundColor: "#CCFBF1", borderRadius: 99, flex: 1, height: 8, overflow: "hidden" }, visualFill: { borderRadius: 99, height: 8 }, visualPercent: { color: appTheme.primary, fontSize: 10, fontWeight: "800", textAlign: "left", width: 32 }, comparison: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE", borderRadius: 15, borderWidth: 1, gap: 8, padding: 12 }, comparisonTitle: { color: appTheme.primary, fontSize: 13, fontWeight: "800", textAlign: "right" }, comparisonRow: { borderTopColor: "#DBEAFE", borderTopWidth: 1, gap: 2, paddingTop: 7 }, comparisonTerm: { color: appTheme.ink, fontSize: 12, fontWeight: "800", textAlign: "right" }, comparisonMeta: { color: appTheme.muted, fontSize: 10, textAlign: "right" }, comparisonDelta: { color: appTheme.success, fontSize: 10, fontWeight: "800", textAlign: "right" }, termFilter: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 15, borderWidth: 1, gap: 9, padding: 12 }, filterLabel: { color: appTheme.ink, fontSize: 12, fontWeight: "800", textAlign: "right" }, chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }, chip: { backgroundColor: "#F1F5F9", borderRadius: 99, paddingHorizontal: 11, paddingVertical: 7 }, chipActive: { backgroundColor: appTheme.primarySoft }, chipText: { color: appTheme.muted, fontSize: 11, fontWeight: "800" }, chipTextActive: { color: appTheme.primary }, actionRow: { flexDirection: "row-reverse", gap: 8 }, exportButton: { alignItems: "center", backgroundColor: appTheme.violet, borderRadius: 13, flex: 1, justifyContent: "center", minHeight: 43 }, exportText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" }, shareButton: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 13, flex: 1, justifyContent: "center", minHeight: 43 }, shareText: { color: appTheme.primary, fontSize: 12, fontWeight: "800" }, disabled: { opacity: 0.45 }, card: { alignItems: "flex-start", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, flexDirection: "row-reverse", gap: 10, padding: 14 }, colorDot: { borderRadius: 99, height: 11, marginTop: 5, width: 11 }, cardHeader: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" }, subjectTitle: { color: appTheme.ink, fontSize: 15, fontWeight: "800", textAlign: "right" }, reason: { color: appTheme.muted, fontSize: 11, marginTop: 4, textAlign: "right" }, track: { backgroundColor: "#EDE9FE", borderRadius: 99, height: 7, marginTop: 10, overflow: "hidden" }, fill: { backgroundColor: appTheme.violet, borderRadius: 99, height: 7 }, meta: { color: appTheme.primary, fontSize: 10, fontWeight: "700", marginTop: 6, textAlign: "right" }, back: { backgroundColor: appTheme.primarySoft, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 }, backText: { color: appTheme.primary, fontSize: 11, fontWeight: "800" },
});
