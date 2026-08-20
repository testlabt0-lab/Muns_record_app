import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { AppHeader, EmptyState, IconButton, StatusPill } from "@/components/study-ui";
import { appTheme } from "@/lib/app-theme";
import { formatBytes } from "@/lib/lecture-export-template";
import { createStorageReportHtml } from "@/lib/storage-report";
import { useStudy } from "@/lib/study-context";
import type { Lecture } from "@/lib/study-types";
import { ScreenContainer } from "@/components/screen-container";

export default function StorageScreen() {
  const router = useRouter();
  const { lectures, subjects, reviewCards, getSubject, deleteLecture, restoreDeletedLecture, syncSettings, updateSyncSettings } = useStudy();
  const total = useMemo(() => lectures.reduce((sum, lecture) => sum + (lecture.audioSizeBytes ?? 0) + (lecture.attachments ?? []).reduce((attachmentSum, attachment) => attachmentSum + (attachment.sizeBytes ?? 0), 0), 0), [lectures]);
  const [deviceStorage, setDeviceStorage] = useState<{ capacity: number; free: number } | null>(null);
  const [warningInput, setWarningInput] = useState(String(syncSettings.storageWarningPercent ?? 80));
  const [pendingDeletion, setPendingDeletion] = useState<{ lecture: Lecture; cards: typeof reviewCards } | null>(null);
  const deletionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weeklySummary = useMemo(() => getWeeklyStorageSummary(lectures), [lectures]);
  const subjectStorage = useMemo(() => getSubjectStorageSummary(lectures, getSubject), [lectures, getSubject]);
  const deviceUsedPercent = deviceStorage ? ((deviceStorage.capacity - deviceStorage.free) / deviceStorage.capacity) * 100 : null;
  const storageThreshold = syncSettings.storageWarningPercent ?? 80;
  const isStorageWarning = deviceUsedPercent !== null && deviceUsedPercent >= storageThreshold;

  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    void Promise.all([FileSystem.getTotalDiskCapacityAsync(), FileSystem.getFreeDiskStorageAsync()]).then(([capacity, free]) => {
      if (active && capacity > 0 && free >= 0) setDeviceStorage({ capacity, free });
    }).catch(() => { /* لا تؤثر إحصاءات الجهاز غير المتاحة في بقية الشاشة. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => () => { if (deletionTimer.current) clearTimeout(deletionTimer.current); }, []);

  const finalizeLectureRemoval = (lecture: Lecture) => {
    if (Platform.OS !== "web") {
      const uris = [lecture.audioUri, ...(lecture.audioParts ?? []).map((part) => part.uri), ...(lecture.attachments ?? []).map((attachment) => attachment.uri)].filter(Boolean) as string[];
      Array.from(new Set(uris)).forEach((uri) => { try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* تنظيف الملفات بأفضل جهد فقط. */ } });
    }
  };

  const queueLectureRemoval = (lecture: Lecture) => {
    const cards = reviewCards.filter((card) => card.lectureId === lecture.id);
    deleteLecture(lecture.id);
    setPendingDeletion({ lecture, cards });
    if (deletionTimer.current) clearTimeout(deletionTimer.current);
    deletionTimer.current = setTimeout(() => { finalizeLectureRemoval(lecture); setPendingDeletion(null); deletionTimer.current = null; }, 10_000);
  };

  const undoLectureRemoval = () => {
    if (!pendingDeletion) return;
    if (deletionTimer.current) clearTimeout(deletionTimer.current);
    restoreDeletedLecture(pendingDeletion.lecture, pendingDeletion.cards);
    deletionTimer.current = null;
    setPendingDeletion(null);
  };

  const removeLecture = (lecture: Lecture) => {
    Alert.alert("حذف المحاضرة", `ستُخفى «${lecture.title}» الآن، وسيبقى لديك 10 ثوانٍ لاستعادتها قبل حذف ملفاتها المحلية نهائياً.`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => queueLectureRemoval(lecture) },
    ]);
  };

  const saveStorageThreshold = () => {
    const value = Number(warningInput);
    if (!Number.isInteger(value) || value < 50 || value > 99) { Alert.alert("قيمة غير صالحة", "اختر نسبة صحيحة بين 50% و99%."); return; }
    updateSyncSettings({ storageWarningPercent: value });
    Alert.alert("تم حفظ حد التنبيه", `سيظهر تنبيه عند وصول استخدام الجهاز إلى ${value}%.`);
  };

  const exportStorageReport = async () => {
    if (Platform.OS === "web") { Alert.alert("التصدير متاح على الهاتف", "افتح التطبيق على iOS أو Android لإنشاء ملف PDF ومشاركته عبر تطبيقات جهازك."); return; }
    try {
      const html = createStorageReportHtml({ lectures, subjects });
      const result = await Print.printToFileAsync({ html });
      if (!(await Sharing.isAvailableAsync())) { Alert.alert("تم إنشاء التقرير", "أُنشئ ملف PDF، لكن المشاركة غير متاحة على هذا الجهاز."); return; }
      await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", dialogTitle: "مشاركة تقرير مساحة التخزين" });
    } catch { Alert.alert("تعذر تصدير التقرير", "حاول مرة أخرى أو تحقق من مساحة الجهاز المتاحة."); }
  };

  return <ScreenContainer className="px-5"><AppHeader eyebrow="ملفاتك المحلية" title="مساحة التخزين" action={<IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} tone="neutral" />} /><View style={styles.summary}><View style={styles.summaryIcon}><MaterialIcons name="storage" size={28} color={appTheme.primary} /></View><View style={styles.summaryCopy}><Text style={styles.summaryValue}>{formatBytes(total)}</Text><Text style={styles.summaryText}>الحجم المعروف للتسجيلات والمرفقات المحفوظة محلياً</Text></View><StatusPill label={`${lectures.length} محاضرة`} tone="primary" /></View>{pendingDeletion ? <View style={styles.warningCard}><MaterialIcons name="undo" size={23} color={appTheme.warning} /><View style={styles.rowCopy}><Text style={styles.warningTitle}>يمكنك استرداد المحاضرة الآن</Text><Text style={styles.warningText}>ستحذف ملفات «{pendingDeletion.lecture.title}» نهائياً بعد ثوانٍ قليلة.</Text></View><Pressable onPress={undoLectureRemoval} style={styles.thresholdSave}><Text style={styles.thresholdSaveText}>استرداد</Text></Pressable></View> : null}{isStorageWarning ? <View style={styles.warningCard}><MaterialIcons name="warning-amber" size={23} color={appTheme.warning} /><View style={styles.rowCopy}><Text style={styles.warningTitle}>مساحة الجهاز تقترب من الامتلاء</Text><Text style={styles.warningText}>استخدام الجهاز الآن {deviceUsedPercent!.toFixed(0)}%، وهو أعلى من حدك المحدد ({storageThreshold}%). راجع التسجيلات الكبيرة أو انقلها إلى نسخة مشفرة.</Text></View></View> : null}<View style={styles.thresholdCard}><View style={styles.thresholdHeading}><MaterialIcons name="notifications-active" size={20} color={appTheme.warning} /><View style={styles.rowCopy}><Text style={styles.thresholdTitle}>حد تنبيه استخدام الجهاز</Text><Text style={styles.thresholdHint}>{deviceUsedPercent === null ? "تظهر القراءة عند فتح التطبيق على الهاتف." : `استخدام الجهاز الحالي: ${deviceUsedPercent.toFixed(0)}%`}</Text></View></View><View style={styles.thresholdControls}><TextInput value={warningInput} onChangeText={setWarningInput} keyboardType="number-pad" maxLength={2} textAlign="center" style={styles.thresholdInput} /><Text style={styles.thresholdUnit}>%</Text><Pressable onPress={saveStorageThreshold} style={styles.thresholdSave}><Text style={styles.thresholdSaveText}>حفظ الحد</Text></Pressable></View></View><View style={styles.thresholdCard}><View style={styles.thresholdHeading}><MaterialIcons name="picture-as-pdf" size={20} color={appTheme.primary} /><View style={styles.rowCopy}><Text style={styles.thresholdTitle}>تقرير مساحة التخزين</Text><Text style={styles.thresholdHint}>ينشأ محلياً ويعرض الحجم والتوزيع حسب المادة قبل مشاركته.</Text></View></View><Pressable onPress={() => void exportStorageReport()} style={styles.thresholdSave}><Text style={styles.thresholdSaveText}>تصدير PDF</Text></Pressable></View><WeeklyStorageSummary summary={weeklySummary} total={total} capacity={deviceStorage?.capacity} /><SubjectStorageSummary entries={subjectStorage} total={total} /><FlatList data={lectures} keyExtractor={(item) => item.id} contentContainerStyle={lectures.length ? styles.list : styles.emptyList} renderItem={({ item }) => <StorageRow lecture={item} subjectName={getSubject(item.subjectId)?.title ?? "مادة"} onDelete={() => removeLecture(item)} />} ListEmptyComponent={<EmptyState icon="folder-off" title="لا توجد ملفات محفوظة" description="ستظهر هنا التسجيلات والمرفقات بعد حفظ أول محاضرة." />} /></ScreenContainer>;
}

function getLectureSize(lecture: Lecture) { return (lecture.audioSizeBytes ?? 0) + (lecture.attachments ?? []).reduce((sum, attachment) => sum + (attachment.sizeBytes ?? 0), 0); }

function getSubjectStorageSummary(lectures: Lecture[], getSubject: (subjectId: string) => { title: string } | undefined) {
  const bySubject = new Map<string, { title: string; bytes: number; lectureCount: number }>();
  lectures.forEach((lecture) => {
    const existing = bySubject.get(lecture.subjectId);
    const title = getSubject(lecture.subjectId)?.title ?? "مادة غير محددة";
    const size = getLectureSize(lecture);
    bySubject.set(lecture.subjectId, { title, bytes: (existing?.bytes ?? 0) + size, lectureCount: (existing?.lectureCount ?? 0) + 1 });
  });
  return Array.from(bySubject.values()).sort((a, b) => b.bytes - a.bytes);
}

function getWeeklyStorageSummary(lectures: Lecture[]) {
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setHours(0, 0, 0, 0);
  thisWeekStart.setDate(now.getDate() - 6);
  const previousWeekStart = new Date(thisWeekStart);
  previousWeekStart.setDate(thisWeekStart.getDate() - 7);
  const thisWeek = lectures.filter((lecture) => { const date = new Date(lecture.recordedAt); return date >= thisWeekStart && date <= now; });
  const lastWeek = lectures.filter((lecture) => { const date = new Date(lecture.recordedAt); return date >= previousWeekStart && date < thisWeekStart; });
  const thisWeekBytes = thisWeek.reduce((sum, lecture) => sum + getLectureSize(lecture), 0);
  const lastWeekBytes = lastWeek.reduce((sum, lecture) => sum + getLectureSize(lecture), 0);
  return { thisWeekBytes, lastWeekBytes, lectureCount: thisWeek.length };
}

function WeeklyStorageSummary({ summary, total, capacity }: { summary: ReturnType<typeof getWeeklyStorageSummary>; total: number; capacity?: number }) {
  const hasComparison = summary.lastWeekBytes > 0;
  const difference = summary.thisWeekBytes - summary.lastWeekBytes;
  const direction = difference > 0 ? "ارتفع" : difference < 0 ? "انخفض" : "لم يتغير";
  const percentage = hasComparison ? Math.abs(Math.round((difference / summary.lastWeekBytes) * 100)) : null;
  const appUsagePercent = capacity ? Math.min(100, (total / capacity) * 100) : null;
  return <View style={styles.weeklyCard}><View style={styles.weeklyHeading}><View style={styles.weeklyIcon}><MaterialIcons name="date-range" size={19} color={appTheme.violet} /></View><View style={styles.rowCopy}><Text style={styles.weeklyTitle}>ملخص آخر 7 أيام</Text><Text style={styles.weeklyHint}>يعتمد على تاريخ تسجيل المحاضرة وحجم ملفاتها المعروف.</Text></View></View><View style={styles.weeklyMetrics}><Metric label="أُضيف هذا الأسبوع" value={formatBytes(summary.thisWeekBytes)} /><Metric label="محاضرات جديدة" value={`${summary.lectureCount}`} /><Metric label="الأسبوع السابق" value={formatBytes(summary.lastWeekBytes)} /></View><Text style={styles.weeklyTrend}>{hasComparison ? `${direction} الحجم ${percentage}% مقارنة بالأسبوع السابق.` : "سيتوفر اتجاه المقارنة بعد تسجيل ملفات في الأسبوع السابق."}</Text>{appUsagePercent !== null ? <View style={styles.usageWrap}><View style={styles.usageLabels}><Text style={styles.usageValue}>{appUsagePercent.toFixed(appUsagePercent < 1 ? 2 : 1)}%</Text><Text style={styles.usageLabel}>نسبة ملفات مُحاضِر المعروفة من سعة الجهاز</Text></View><View style={styles.usageTrack}><View style={[styles.usageFill, { width: `${Math.max(1, appUsagePercent)}%` }]} /></View></View> : <Text style={styles.usageUnavailable}>ستظهر نسبة استخدام السعة عند فتح التطبيق على الهاتف.</Text>}</View>;
}

function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }

function SubjectStorageSummary({ entries, total }: { entries: ReturnType<typeof getSubjectStorageSummary>; total: number }) {
  if (!entries.length) return null;
  return <View style={styles.subjectCard}><View style={styles.subjectHeading}><View style={styles.subjectIcon}><MaterialIcons name="pie-chart-outline" size={19} color={appTheme.success} /></View><View style={styles.rowCopy}><Text style={styles.subjectTitle}>استخدام المساحة حسب المادة</Text><Text style={styles.subjectHint}>أكبر المواد حجماً تظهر أولاً لتسهيل إدارة التسجيلات.</Text></View></View>{entries.slice(0, 4).map((entry) => { const share = total > 0 ? Math.min(100, (entry.bytes / total) * 100) : 0; return <View key={entry.title} style={styles.subjectRow}><View style={styles.subjectLabels}><Text style={styles.subjectValue}>{formatBytes(entry.bytes)} · {share.toFixed(0)}%</Text><View style={styles.rowCopy}><Text style={styles.subjectName} numberOfLines={1}>{entry.title}</Text><Text style={styles.subjectMeta}>{entry.lectureCount} {entry.lectureCount === 1 ? "محاضرة" : "محاضرات"}</Text></View></View><View style={styles.subjectTrack}><View style={[styles.subjectFill, { width: `${Math.max(2, share)}%` }]} /></View></View>; })}{entries.length > 4 ? <Text style={styles.subjectMore}>+ {entries.length - 4} مواد أخرى</Text> : null}</View>;
}

function StorageRow({ lecture, subjectName, onDelete }: { lecture: Lecture; subjectName: string; onDelete: () => void }) { const attachmentSize = (lecture.attachments ?? []).reduce((sum, attachment) => sum + (attachment.sizeBytes ?? 0), 0); const size = (lecture.audioSizeBytes ?? 0) + attachmentSize; return <View style={styles.row}><View style={styles.rowIcon}><MaterialIcons name="graphic-eq" size={21} color={appTheme.primary} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle} numberOfLines={1}>{lecture.title}</Text><Text style={styles.rowMeta}>{subjectName} · {formatBytes(size)} · {(lecture.attachments ?? []).length} مرفق</Text></View><Pressable accessibilityRole="button" accessibilityLabel="حذف المحاضرة" onPress={onDelete} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}><MaterialIcons name="delete-outline" size={21} color={appTheme.danger} /></Pressable></View>; }

const styles = StyleSheet.create({ summary: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 20, flexDirection: "row-reverse", gap: 12, marginBottom: 12, padding: 16 }, summaryIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 15, height: 48, justifyContent: "center", width: 48 }, summaryCopy: { flex: 1 }, summaryValue: { color: appTheme.ink, fontSize: 20, fontWeight: "800", textAlign: "right" }, summaryText: { color: appTheme.muted, fontSize: 11, lineHeight: 17, marginTop: 3, textAlign: "right" }, warningCard: { alignItems: "flex-start", backgroundColor: appTheme.warningSoft, borderColor: "#FDE68A", borderRadius: 18, borderWidth: 1, flexDirection: "row-reverse", gap: 10, marginBottom: 12, padding: 14 }, warningTitle: { color: "#92400E", fontSize: 13, fontWeight: "800", textAlign: "right" }, warningText: { color: "#A16207", fontSize: 11, lineHeight: 17, marginTop: 3, textAlign: "right" }, thresholdCard: { backgroundColor: appTheme.surface, borderColor: "#FDE68A", borderRadius: 18, borderWidth: 1, gap: 10, marginBottom: 12, padding: 14 }, thresholdHeading: { alignItems: "center", flexDirection: "row-reverse", gap: 10 }, thresholdTitle: { color: appTheme.ink, fontSize: 13, fontWeight: "800", textAlign: "right" }, thresholdHint: { color: appTheme.muted, fontSize: 10, marginTop: 3, textAlign: "right" }, thresholdControls: { alignItems: "center", flexDirection: "row-reverse", gap: 8 }, thresholdInput: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A", borderRadius: 11, borderWidth: 1, color: appTheme.ink, fontSize: 14, fontWeight: "800", height: 40, width: 58 }, thresholdUnit: { color: appTheme.muted, fontSize: 13, fontWeight: "800" }, thresholdSave: { alignItems: "center", backgroundColor: appTheme.warningSoft, borderRadius: 11, justifyContent: "center", marginRight: "auto", minHeight: 40, paddingHorizontal: 14 }, thresholdSaveText: { color: "#92400E", fontSize: 12, fontWeight: "800" }, weeklyCard: { backgroundColor: appTheme.surface, borderColor: "#DDD6FE", borderRadius: 20, borderWidth: 1, gap: 12, marginBottom: 12, padding: 15 }, weeklyHeading: { alignItems: "center", flexDirection: "row-reverse", gap: 10 }, weeklyIcon: { alignItems: "center", backgroundColor: "#F5F3FF", borderRadius: 12, height: 38, justifyContent: "center", width: 38 }, weeklyTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, weeklyHint: { color: appTheme.muted, fontSize: 10, lineHeight: 15, marginTop: 2, textAlign: "right" }, weeklyMetrics: { flexDirection: "row-reverse", gap: 7 }, metric: { backgroundColor: "#FAFAFF", borderRadius: 12, flex: 1, padding: 9 }, metricValue: { color: appTheme.ink, fontSize: 13, fontWeight: "800", textAlign: "right" }, metricLabel: { color: appTheme.muted, fontSize: 9, lineHeight: 13, marginTop: 3, textAlign: "right" }, weeklyTrend: { color: appTheme.violet, fontSize: 11, fontWeight: "700", textAlign: "right" }, usageWrap: { gap: 6 }, usageLabels: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" }, usageValue: { color: appTheme.primary, fontSize: 12, fontWeight: "800" }, usageLabel: { color: appTheme.muted, fontSize: 10, textAlign: "right" }, usageTrack: { backgroundColor: "#E2E8F0", borderRadius: 99, height: 7, overflow: "hidden" }, usageFill: { backgroundColor: appTheme.primary, borderRadius: 99, height: 7 }, usageUnavailable: { color: appTheme.muted, fontSize: 10, textAlign: "right" }, subjectCard: { backgroundColor: appTheme.surface, borderColor: "#A7F3D0", borderRadius: 20, borderWidth: 1, gap: 12, marginBottom: 16, padding: 15 }, subjectHeading: { alignItems: "center", flexDirection: "row-reverse", gap: 10 }, subjectIcon: { alignItems: "center", backgroundColor: appTheme.successSoft, borderRadius: 12, height: 38, justifyContent: "center", width: 38 }, subjectTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, subjectHint: { color: appTheme.muted, fontSize: 10, lineHeight: 15, marginTop: 2, textAlign: "right" }, subjectRow: { gap: 6 }, subjectLabels: { alignItems: "center", flexDirection: "row-reverse", gap: 10 }, subjectValue: { color: appTheme.success, fontSize: 11, fontWeight: "800" }, subjectName: { color: appTheme.ink, fontSize: 12, fontWeight: "800", textAlign: "right" }, subjectMeta: { color: appTheme.muted, fontSize: 10, marginTop: 2, textAlign: "right" }, subjectTrack: { backgroundColor: "#D1FAE5", borderRadius: 99, height: 6, overflow: "hidden" }, subjectFill: { backgroundColor: appTheme.success, borderRadius: 99, height: 6 }, subjectMore: { color: appTheme.muted, fontSize: 10, fontWeight: "700", textAlign: "right" }, list: { gap: 10, paddingBottom: 24 }, emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 32 }, row: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, flexDirection: "row-reverse", gap: 11, padding: 13 }, rowIcon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 13, height: 42, justifyContent: "center", width: 42 }, rowCopy: { flex: 1 }, rowTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, rowMeta: { color: appTheme.muted, fontSize: 11, marginTop: 4, textAlign: "right" }, deleteButton: { alignItems: "center", backgroundColor: appTheme.dangerSoft, borderRadius: 12, height: 38, justifyContent: "center", width: 38 }, pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] } });
