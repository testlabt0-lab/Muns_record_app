import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";

import { AppHeader, EmptyState, IconButton, StatusPill } from "@/components/study-ui";
import { appTheme } from "@/lib/app-theme";
import { formatBytes } from "@/lib/lecture-export-template";
import { useStudy } from "@/lib/study-context";
import type { Lecture } from "@/lib/study-types";
import { ScreenContainer } from "@/components/screen-container";

export default function StorageScreen() {
  const router = useRouter();
  const { lectures, getSubject, deleteLecture } = useStudy();
  const breakdown = useMemo(() => getStorageBreakdown(lectures), [lectures]);
  const total = breakdown.total;
  const [deviceStorage, setDeviceStorage] = useState<{ capacity: number; free: number } | null>(null);
  const weeklySummary = useMemo(() => getWeeklyStorageSummary(lectures), [lectures]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    void Promise.all([FileSystem.getTotalDiskCapacityAsync(), FileSystem.getFreeDiskStorageAsync()]).then(([capacity, free]) => {
      if (active && capacity > 0 && free >= 0) setDeviceStorage({ capacity, free });
    }).catch(() => { /* لا تؤثر إحصاءات الجهاز غير المتاحة في بقية الشاشة. */ });
    return () => { active = false; };
  }, []);

  const removeLecture = (lecture: Lecture) => {
    Alert.alert("حذف المحاضرة", `سيُحذف «${lecture.title}» من الجهاز مع النص والملخص والمرفقات المحلية.`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => {
        if (Platform.OS !== "web") {
          [lecture.audioUri, ...(lecture.attachments ?? []).map((attachment) => attachment.uri)].filter(Boolean).forEach((uri) => {
            try { const file = new File(uri!); if (file.exists) file.delete(); } catch { /* Keep cleanup best-effort. */ }
          });
        }
        deleteLecture(lecture.id);
      } },
    ]);
  };

  return <ScreenContainer className="px-5"><AppHeader eyebrow="ملفاتك المحلية" title="مساحة التخزين" action={<IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} tone="neutral" />} /><View style={styles.summary}><View style={styles.summaryIcon}><MaterialIcons name="storage" size={28} color={appTheme.primary} /></View><View style={styles.summaryCopy}><Text style={styles.summaryValue}>{formatBytes(total)}</Text><Text style={styles.summaryText}>الحجم المعروف للتسجيلات والمرفقات المحفوظة محلياً</Text></View><StatusPill label={`${lectures.length} محاضرة`} tone="primary" /></View><StorageBreakdown audioBytes={breakdown.audioBytes} attachmentBytes={breakdown.attachmentBytes} /><WeeklyStorageSummary summary={weeklySummary} total={total} capacity={deviceStorage?.capacity} /><FlatList data={lectures} keyExtractor={(item) => item.id} contentContainerStyle={lectures.length ? styles.list : styles.emptyList} renderItem={({ item }) => <StorageRow lecture={item} subjectName={getSubject(item.subjectId)?.title ?? "مادة"} onDelete={() => removeLecture(item)} />} ListEmptyComponent={<EmptyState icon="folder-off" title="لا توجد ملفات محفوظة" description="ستظهر هنا التسجيلات والمرفقات بعد حفظ أول محاضرة." />} /></ScreenContainer>;
}

function getLectureSize(lecture: Lecture) { return (lecture.audioSizeBytes ?? 0) + (lecture.attachments ?? []).reduce((sum, attachment) => sum + (attachment.sizeBytes ?? 0), 0); }

function getStorageBreakdown(lectures: Lecture[]) {
  const audioBytes = lectures.reduce((sum, lecture) => sum + (lecture.audioSizeBytes ?? 0) + (lecture.audioParts ?? []).reduce((partSum, part) => partSum + (part.sizeBytes ?? 0), 0), 0);
  const attachmentBytes = lectures.reduce((sum, lecture) => sum + (lecture.attachments ?? []).reduce((attachmentSum, attachment) => attachmentSum + (attachment.sizeBytes ?? 0), 0), 0);
  return { audioBytes, attachmentBytes, total: audioBytes + attachmentBytes };
}

function StorageBreakdown({ audioBytes, attachmentBytes }: { audioBytes: number; attachmentBytes: number }) {
  return <View style={styles.breakdown}><Text style={styles.breakdownTitle}>تفصيل المساحة</Text><View style={styles.breakdownRow}><Text style={styles.breakdownValue}>{formatBytes(audioBytes)}</Text><Text style={styles.breakdownLabel}>التسجيلات الصوتية</Text></View><View style={styles.breakdownRow}><Text style={styles.breakdownValue}>{formatBytes(attachmentBytes)}</Text><Text style={styles.breakdownLabel}>المرفقات</Text></View></View>;
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

function StorageRow({ lecture, subjectName, onDelete }: { lecture: Lecture; subjectName: string; onDelete: () => void }) { const attachmentSize = (lecture.attachments ?? []).reduce((sum, attachment) => sum + (attachment.sizeBytes ?? 0), 0); const size = (lecture.audioSizeBytes ?? 0) + attachmentSize; return <View style={styles.row}><View style={styles.rowIcon}><MaterialIcons name="graphic-eq" size={21} color={appTheme.primary} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle} numberOfLines={1}>{lecture.title}</Text><Text style={styles.rowMeta}>{subjectName} · {formatBytes(size)} · {(lecture.attachments ?? []).length} مرفق</Text></View><Pressable accessibilityRole="button" accessibilityLabel="حذف المحاضرة" onPress={onDelete} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}><MaterialIcons name="delete-outline" size={21} color={appTheme.danger} /></Pressable></View>; }

const styles = StyleSheet.create({ summary: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 20, flexDirection: "row-reverse", gap: 12, marginBottom: 12, padding: 16 }, summaryIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 15, height: 48, justifyContent: "center", width: 48 }, summaryCopy: { flex: 1 }, summaryValue: { color: appTheme.ink, fontSize: 20, fontWeight: "800", textAlign: "right" }, summaryText: { color: appTheme.muted, fontSize: 11, lineHeight: 17, marginTop: 3, textAlign: "right" }, breakdown: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 16, borderWidth: 1, gap: 8, marginBottom: 12, padding: 14 }, breakdownTitle: { color: appTheme.ink, fontSize: 13, fontWeight: "800", textAlign: "right" }, breakdownRow: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" }, breakdownLabel: { color: appTheme.muted, fontSize: 11, textAlign: "right" }, breakdownValue: { color: appTheme.primary, fontSize: 12, fontWeight: "800" }, weeklyCard: { backgroundColor: appTheme.surface, borderColor: "#DDD6FE", borderRadius: 20, borderWidth: 1, gap: 12, marginBottom: 16, padding: 15 }, weeklyHeading: { alignItems: "center", flexDirection: "row-reverse", gap: 10 }, weeklyIcon: { alignItems: "center", backgroundColor: "#F5F3FF", borderRadius: 12, height: 38, justifyContent: "center", width: 38 }, weeklyTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, weeklyHint: { color: appTheme.muted, fontSize: 10, lineHeight: 15, marginTop: 2, textAlign: "right" }, weeklyMetrics: { flexDirection: "row-reverse", gap: 7 }, metric: { backgroundColor: "#FAFAFF", borderRadius: 12, flex: 1, padding: 9 }, metricValue: { color: appTheme.ink, fontSize: 13, fontWeight: "800", textAlign: "right" }, metricLabel: { color: appTheme.muted, fontSize: 9, lineHeight: 13, marginTop: 3, textAlign: "right" }, weeklyTrend: { color: appTheme.violet, fontSize: 11, fontWeight: "700", textAlign: "right" }, usageWrap: { gap: 6 }, usageLabels: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" }, usageValue: { color: appTheme.primary, fontSize: 12, fontWeight: "800" }, usageLabel: { color: appTheme.muted, fontSize: 10, textAlign: "right" }, usageTrack: { backgroundColor: "#E2E8F0", borderRadius: 99, height: 7, overflow: "hidden" }, usageFill: { backgroundColor: appTheme.primary, borderRadius: 99, height: 7 }, usageUnavailable: { color: appTheme.muted, fontSize: 10, textAlign: "right" }, list: { gap: 10, paddingBottom: 24 }, emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 32 }, row: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, flexDirection: "row-reverse", gap: 11, padding: 13 }, rowIcon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 13, height: 42, justifyContent: "center", width: 42 }, rowCopy: { flex: 1 }, rowTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, rowMeta: { color: appTheme.muted, fontSize: 11, marginTop: 4, textAlign: "right" }, deleteButton: { alignItems: "center", backgroundColor: appTheme.dangerSoft, borderRadius: 12, height: 38, justifyContent: "center", width: 38 }, pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] } });
