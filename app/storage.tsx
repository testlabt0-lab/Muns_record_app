import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { File } from "expo-file-system";

import { AppHeader, EmptyState, IconButton, StatusPill } from "@/components/study-ui";
import { appTheme } from "@/lib/app-theme";
import { formatBytes } from "@/lib/lecture-export-template";
import { useStudy } from "@/lib/study-context";
import type { Lecture } from "@/lib/study-types";
import { ScreenContainer } from "@/components/screen-container";

export default function StorageScreen() {
  const router = useRouter();
  const { lectures, getSubject, deleteLecture } = useStudy();
  const total = useMemo(() => lectures.reduce((sum, lecture) => sum + (lecture.audioSizeBytes ?? 0) + (lecture.attachments ?? []).reduce((attachmentSum, attachment) => attachmentSum + (attachment.sizeBytes ?? 0), 0), 0), [lectures]);

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

  return <ScreenContainer className="px-5"><AppHeader eyebrow="ملفاتك المحلية" title="مساحة التخزين" action={<IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} tone="neutral" />} /><View style={styles.summary}><View style={styles.summaryIcon}><MaterialIcons name="storage" size={28} color={appTheme.primary} /></View><View style={styles.summaryCopy}><Text style={styles.summaryValue}>{formatBytes(total)}</Text><Text style={styles.summaryText}>الحجم المعروف للتسجيلات والمرفقات المحفوظة محلياً</Text></View><StatusPill label={`${lectures.length} محاضرة`} tone="primary" /></View><FlatList data={lectures} keyExtractor={(item) => item.id} contentContainerStyle={lectures.length ? styles.list : styles.emptyList} renderItem={({ item }) => <StorageRow lecture={item} subjectName={getSubject(item.subjectId)?.title ?? "مادة"} onDelete={() => removeLecture(item)} />} ListEmptyComponent={<EmptyState icon="folder-off" title="لا توجد ملفات محفوظة" description="ستظهر هنا التسجيلات والمرفقات بعد حفظ أول محاضرة." />} /></ScreenContainer>;
}

function StorageRow({ lecture, subjectName, onDelete }: { lecture: Lecture; subjectName: string; onDelete: () => void }) { const attachmentSize = (lecture.attachments ?? []).reduce((sum, attachment) => sum + (attachment.sizeBytes ?? 0), 0); const size = (lecture.audioSizeBytes ?? 0) + attachmentSize; return <View style={styles.row}><View style={styles.rowIcon}><MaterialIcons name="graphic-eq" size={21} color={appTheme.primary} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle} numberOfLines={1}>{lecture.title}</Text><Text style={styles.rowMeta}>{subjectName} · {formatBytes(size)} · {(lecture.attachments ?? []).length} مرفق</Text></View><Pressable accessibilityRole="button" accessibilityLabel="حذف المحاضرة" onPress={onDelete} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}><MaterialIcons name="delete-outline" size={21} color={appTheme.danger} /></Pressable></View>; }

const styles = StyleSheet.create({ summary: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 20, flexDirection: "row-reverse", gap: 12, marginBottom: 16, padding: 16 }, summaryIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 15, height: 48, justifyContent: "center", width: 48 }, summaryCopy: { flex: 1 }, summaryValue: { color: appTheme.ink, fontSize: 20, fontWeight: "800", textAlign: "right" }, summaryText: { color: appTheme.muted, fontSize: 11, lineHeight: 17, marginTop: 3, textAlign: "right" }, list: { gap: 10, paddingBottom: 24 }, emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 32 }, row: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, flexDirection: "row-reverse", gap: 11, padding: 13 }, rowIcon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 13, height: 42, justifyContent: "center", width: 42 }, rowCopy: { flex: 1 }, rowTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, rowMeta: { color: appTheme.muted, fontSize: 11, marginTop: 4, textAlign: "right" }, deleteButton: { alignItems: "center", backgroundColor: appTheme.dangerSoft, borderRadius: 12, height: 38, justifyContent: "center", width: 38 }, pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] } });
