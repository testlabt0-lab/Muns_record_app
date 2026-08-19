import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { File } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { AppHeader, EmptyState, IconButton, LoadingView, PrimaryButton, StatusPill } from "@/components/study-ui";
import { getApiBaseUrl } from "@/constants/oauth";
import { appTheme } from "@/lib/app-theme";
import { exportLecturePdf } from "@/lib/lecture-export";
import { attachmentKindFromMime, persistAttachment } from "@/lib/local-attachments";
import { useStudy } from "@/lib/study-context";
import { trpc } from "@/lib/trpc";
import { ScreenContainer } from "@/components/screen-container";

export default function LectureDetailScreen() {
  const router = useRouter();
  const { lectureId } = useLocalSearchParams<{ lectureId: string }>();
  const { hydrated, lectures, getSubject, updateLecture, addReviewCards, reviewCards, addAttachment, removeAttachment } = useStudy();
  const lecture = lectures.find((item) => item.id === lectureId);
  const subject = lecture ? getSubject(lecture.subjectId) : undefined;
  const player = useAudioPlayer(lecture?.audioUri ?? null);
  const playerStatus = useAudioPlayerStatus(player);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const summarize = trpc.lectures.summarize.useMutation();

  useEffect(() => { void setAudioModeAsync({ playsInSilentMode: true }); }, []);
  useEffect(() => () => player.release(), [player]);
  if (!hydrated) return <ScreenContainer><LoadingView /></ScreenContainer>;
  if (!lecture) return <ScreenContainer className="p-5"><AppHeader title="المحاضرة" action={<IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} />} /><EmptyState icon="error-outline" title="لم نجد هذه المحاضرة" description="ارجع إلى المادة واختر محاضرة متاحة." /></ScreenContainer>;

  const togglePlayback = () => {
    if (playerStatus.playing) { player.pause(); return; }
    if (playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration) player.seekTo(0);
    player.play();
  };

  const transcribe = async () => {
    if (!lecture.audioUri) return;
    if (Platform.OS === "web") { Alert.alert("استخدم التطبيق على الهاتف", "يتطلب رفع التسجيل الحقيقي تجربة الهاتف عبر Expo Go أو نسخة التطبيق المبنية."); return; }
    try {
      const file = new File(lecture.audioUri);
      if (!file.exists) throw new Error("لم يعد ملف التسجيل متاحاً على الجهاز.");
      if (file.size > 16 * 1024 * 1024) throw new Error("التسجيل أكبر من الحد الحالي. ستتوفر المعالجة المجزأة للتسجيلات الطويلة في التحديث التالي.");
      const apiBaseUrl = getApiBaseUrl();
      if (!apiBaseUrl) throw new Error("تعذر الوصول إلى خدمة التحويل. افتح التطبيق عبر رمز QR أو تحقق من اتصال الشبكة.");
      setIsTranscribing(true);
      updateLecture(lecture.id, { transcriptionStatus: "processing", transcriptionProgress: 15, retryReason: undefined });
      updateLecture(lecture.id, { transcriptionProgress: 45 });
      const response = await fetch(`${apiBaseUrl}/api/lectures/transcribe`, { method: "POST", headers: { "Content-Type": file.type || "audio/m4a" }, body: file });
      const payload = await response.json() as { text?: string; error?: string; segments?: Array<{ id: string; text: string; startSeconds: number; endSeconds: number }> };
      if (!response.ok || !payload.text) throw new Error(payload.error || "تعذر استخراج النص.");
      updateLecture(lecture.id, { transcript: payload.text, transcriptSegments: payload.segments ?? [], transcriptionStatus: "completed", transcriptionProgress: 100, summaryStatus: "ready" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "أعد المحاولة لاحقاً.";
      updateLecture(lecture.id, { transcriptionStatus: "failed", transcriptionProgress: 0, retryReason: message });
      Alert.alert("تعذر تحويل التسجيل", message);
    } finally { setIsTranscribing(false); }
  };

  const createSummary = async () => {
    if (!lecture.transcript) return;
    try {
      updateLecture(lecture.id, { summaryStatus: "processing", summaryProgress: 20, retryReason: undefined });
      const summary = await summarize.mutateAsync({ transcript: lecture.transcript, language: "ar" });
      updateLecture(lecture.id, { summary, summaryStatus: "completed", summaryProgress: 100 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "أعد المحاولة لاحقاً.";
      updateLecture(lecture.id, { summaryStatus: "failed", summaryProgress: 0, retryReason: message });
      Alert.alert("تعذر إنشاء الملخص", message);
    }
  };

  const exportPdf = async () => {
    if (!lecture.transcript && !lecture.summary) { Alert.alert("لا يوجد محتوى للتصدير", "حوّل المحاضرة إلى نص أو أنشئ ملخصاً أولاً."); return; }
    try { await exportLecturePdf(lecture, subject); } catch { Alert.alert("تعذر التصدير", "حاول إنشاء ملف PDF مرة أخرى."); }
  };

  const createReviewCards = () => {
    if (!lecture.summary) return;
    if (reviewCards.some((card) => card.lectureId === lecture.id)) {
      Alert.alert("بطاقات المراجعة جاهزة", "أُنشئت بطاقات لهذه المحاضرة من قبل ويمكنك فتحها من تبويب المراجعة.");
      return;
    }
    addReviewCards(lecture.id, lecture.summary.reviewQuestions.map((question, index) => ({ question, answer: lecture.summary?.keyPoints[index % lecture.summary.keyPoints.length] ?? lecture.summary?.overview ?? "راجع نص المحاضرة." })));
    Alert.alert("تمت الإضافة", "أضيفت أسئلة الملخص إلى مراجعة اليوم.");
  };

  const addImage = async (source: "camera" | "library") => {
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { Alert.alert("نحتاج إذن الكاميرا", "اسمح بالكاميرا لإرفاق صورة للسبورة."); return; }
      }
      const result = source === "camera" ? await ImagePicker.launchCameraAsync({ quality: 0.8 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (result.canceled) return;
      const asset = result.assets[0];
      const uri = await persistAttachment(asset.uri, asset.fileName ?? `board-${Date.now()}.jpg`);
      addAttachment(lecture.id, { kind: "image", title: asset.fileName ?? "صورة السبورة", uri, mimeType: asset.mimeType ?? "image/jpeg", sizeBytes: asset.fileSize });
    } catch { Alert.alert("تعذر إرفاق الصورة", "حاول اختيار الصورة مرة أخرى."); }
  };

  const addDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const uri = await persistAttachment(asset.uri, asset.name);
      addAttachment(lecture.id, { kind: attachmentKindFromMime(asset.mimeType), title: asset.name, uri, mimeType: asset.mimeType ?? "application/octet-stream", sizeBytes: asset.size });
    } catch { Alert.alert("تعذر إرفاق الملف", "حاول اختيار ملف PDF أو Word مرة أخرى."); }
  };

  const deleteAttachment = (attachmentId: string, title: string) => Alert.alert("إزالة المرفق", `هل تريد إزالة «${title}» من هذه المحاضرة؟`, [{ text: "إلغاء", style: "cancel" }, { text: "إزالة", style: "destructive", onPress: () => removeAttachment(lecture.id, attachmentId) }]);

  const statusText = lecture.transcriptionStatus === "completed" ? "تم التحويل إلى نص" : lecture.transcriptionStatus === "processing" ? "يجري التحويل" : lecture.transcriptionStatus === "failed" ? "فشل التحويل" : "محفوظ محلياً";
  const statusTone = lecture.transcriptionStatus === "completed" ? "success" : lecture.transcriptionStatus === "processing" ? "warning" : "neutral";
  const audioProgress = playerStatus.duration ? Math.min(100, (playerStatus.currentTime / playerStatus.duration) * 100) : 0;

  return <ScreenContainer className="px-5"><AppHeader eyebrow={subject?.title ?? "محاضرة"} title={lecture.title} action={<IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} tone="neutral" />} /><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.audioCard}>
      <View style={styles.audioTop}><StatusPill label={lecture.section === "theory" ? "نظري" : "عملي"} tone="primary" /><Text style={styles.date}>{new Date(lecture.recordedAt).toLocaleDateString("ar", { month: "long", day: "numeric" })}</Text></View>
      <View style={styles.wave}>{[18, 30, 46, 25, 54, 34, 20].map((height, index) => <View key={index} style={[styles.waveLine, { height }]} />)}</View>
      <View style={styles.playRow}><Text style={styles.duration}>{formatDuration(Math.floor(playerStatus.duration || lecture.durationSeconds))}</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${audioProgress}%` }]} /></View><Text style={styles.duration}>{formatDuration(Math.floor(playerStatus.currentTime || 0))}</Text></View>
      <Pressable onPress={togglePlayback} style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}><MaterialIcons name={playerStatus.playing ? "pause" : "play-arrow"} size={27} color="#FFFFFF" /><Text style={styles.playText}>{playerStatus.playing ? "إيقاف مؤقت" : "تشغيل التسجيل"}</Text></Pressable>
    </View>

    <Pressable disabled={!lecture.transcript && !lecture.summary} onPress={exportPdf} style={({ pressed }) => [styles.exportButton, (!lecture.transcript && !lecture.summary) && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="picture-as-pdf" size={20} color={appTheme.primary} /><Text style={styles.exportText}>تصدير النص والملخص PDF</Text></Pressable>

    <View style={styles.attachmentsCard}><View style={styles.attachmentsHeader}><Text style={styles.sectionTitle}>مرفقات المحاضرة</Text><StatusPill label={`${(lecture.attachments ?? []).length} مرفق`} tone="neutral" /></View><View style={styles.attachmentActions}><Pressable onPress={() => void addImage("camera")} style={styles.attachmentAction}><MaterialIcons name="photo-camera" size={18} color={appTheme.primary} /><Text style={styles.attachmentActionText}>التقاط سبورة</Text></Pressable><Pressable onPress={() => void addImage("library")} style={styles.attachmentAction}><MaterialIcons name="image" size={18} color={appTheme.primary} /><Text style={styles.attachmentActionText}>إضافة صورة</Text></Pressable><Pressable onPress={() => void addDocument()} style={styles.attachmentAction}><MaterialIcons name="attach-file" size={18} color={appTheme.primary} /><Text style={styles.attachmentActionText}>PDF أو ملف</Text></Pressable></View>{(lecture.attachments ?? []).map((attachment) => <View key={attachment.id} style={styles.attachmentRow}><Pressable onPress={() => void Linking.openURL(attachment.uri)} style={styles.attachmentOpen}><MaterialIcons name={attachment.kind === "image" ? "image" : "description"} size={19} color={appTheme.primary} /><Text style={styles.attachmentTitle} numberOfLines={1}>{attachment.title}</Text></Pressable><Pressable accessibilityLabel="إزالة المرفق" onPress={() => deleteAttachment(attachment.id, attachment.title)} style={styles.attachmentDelete}><MaterialIcons name="close" size={17} color={appTheme.danger} /></Pressable></View>)}</View>

    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>النص</Text><StatusPill label={statusText} tone={statusTone} /></View>
    {lecture.transcript ? <View style={styles.transcriptCard}>{lecture.transcriptSegments?.length ? lecture.transcriptSegments.map((segment) => <Pressable key={segment.id} onPress={() => { player.seekTo(segment.startSeconds); player.play(); }} style={({ pressed }) => [styles.segmentLine, pressed && styles.pressed]}><MaterialIcons name="play-circle-outline" size={18} color={appTheme.primary} /><Text style={styles.segmentText}>{segment.text}</Text><Text style={styles.segmentTime}>{formatDuration(Math.floor(segment.startSeconds))}</Text></Pressable>) : <Text style={styles.transcript}>{lecture.transcript}</Text>}</View> : <ActionCard icon="text-snippet" color={appTheme.primary} title={lecture.transcriptionStatus === "failed" ? "تعذر التحويل سابقاً" : "حوّل التسجيل إلى نص"} description={lecture.transcriptionStatus === "failed" ? lecture.retryReason ?? "تحقق من الشبكة ثم أعد المحاولة." : "يُرفع التسجيل عند اختيارك لهذه الخطوة فقط ثم يحفظ النص مع المحاضرة."}>{isTranscribing || lecture.transcriptionStatus === "processing" ? <ProgressNotice progress={lecture.transcriptionProgress ?? 15} label="يجري رفع التسجيل وتحويله" /> : <PrimaryButton label={lecture.transcriptionStatus === "failed" ? "إعادة المحاولة" : "تحويل إلى نص"} icon="text-snippet" onPress={transcribe} />}</ActionCard>}

    {lecture.transcript ? <><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>الملخص الذكي</Text>{lecture.summary ? <StatusPill label="جاهز للمراجعة" tone="success" /> : null}</View>{lecture.summary ? <><SummaryView summary={lecture.summary} /><View style={styles.reviewAction}><PrimaryButton label="إضافة أسئلة إلى المراجعة" icon="style" onPress={createReviewCards} /></View></> : <ActionCard icon="psychology" color={appTheme.violet} title={lecture.summaryStatus === "failed" ? "تعذر التلخيص سابقاً" : "رتّب أهم ما في المحاضرة"} description={lecture.summaryStatus === "failed" ? lecture.retryReason ?? "أعد المحاولة بعد التأكد من الاتصال." : "ينشئ ملخصاً ونقاطاً ومصطلحات وأسئلة مراجعة من النص."}>{summarize.isPending || lecture.summaryStatus === "processing" ? <ProgressNotice progress={lecture.summaryProgress ?? 20} label="يجري إنشاء الملخص الذكي" /> : <PrimaryButton label={lecture.summaryStatus === "failed" ? "إعادة المحاولة" : "إنشاء ملخص"} icon="auto-awesome" onPress={createSummary} />}</ActionCard>}</> : null}
  </ScrollView></ScreenContainer>;
}

function ActionCard({ icon, color, title, description, children }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; color: string; title: string; description: string; children: React.ReactNode }) { return <View style={styles.actionCard}><MaterialIcons name={icon} size={25} color={color} /><View style={styles.actionCopy}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionBody}>{description}</Text></View>{children}</View>; }
function ProgressNotice({ progress, label }: { progress: number; label: string }) { return <View style={styles.progressNotice}><View style={styles.progressTrackLight}><View style={[styles.progressFillLight, { width: `${Math.max(8, Math.min(100, progress))}%` }]} /></View><Text style={styles.progressNoticeText}>{label} · {Math.round(progress)}%</Text></View>; }
function SummaryView({ summary }: { summary: NonNullable<ReturnType<typeof useStudy>["lectures"][number]["summary"]> }) { return <View style={styles.summaryCard}><Text style={styles.summaryOverview}>{summary.overview}</Text><SummaryGroup title="أهم النقاط" icon="format-list-bulleted" items={summary.keyPoints} /><SummaryGroup title="مصطلحات مهمة" icon="label-outline" items={summary.terms} compact /><SummaryGroup title="أسئلة للمراجعة" icon="help-outline" items={summary.reviewQuestions} /></View>; }
function SummaryGroup({ title, icon, items, compact = false }: { title: string; icon: React.ComponentProps<typeof MaterialIcons>["name"]; items: string[]; compact?: boolean }) { return <View style={styles.summaryGroup}><View style={styles.summaryHeading}><MaterialIcons name={icon} size={17} color={appTheme.primary} /><Text style={styles.summaryTitle}>{title}</Text></View>{compact ? <View style={styles.tags}>{items.map((item) => <View key={item} style={styles.tag}><Text style={styles.tagText}>{item}</Text></View>)}</View> : items.map((item, index) => <View key={`${item}-${index}`} style={styles.summaryItem}><View style={styles.bullet} /><Text style={styles.summaryItemText}>{item}</Text></View>)}</View>; }
function formatDuration(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`; }

const styles = StyleSheet.create({
  content: { gap: 17, paddingBottom: 32 }, audioCard: { backgroundColor: appTheme.ink, borderRadius: 25, padding: 19 }, audioTop: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" }, date: { color: "#CBD5E1", fontSize: 12 }, wave: { alignItems: "center", flexDirection: "row-reverse", gap: 7, height: 68, justifyContent: "center", marginTop: 10 }, waveLine: { backgroundColor: "#A5B4FC", borderRadius: 10, opacity: 0.9, width: 7 }, playRow: { alignItems: "center", flexDirection: "row-reverse", gap: 9, marginBottom: 15 }, duration: { color: "#CBD5E1", fontSize: 11, fontVariant: ["tabular-nums"] }, progressTrack: { backgroundColor: "#334155", borderRadius: 5, flex: 1, height: 5, overflow: "hidden" }, progressFill: { backgroundColor: "#A5B4FC", borderRadius: 5, height: 5 }, playButton: { alignItems: "center", backgroundColor: appTheme.primary, borderRadius: 14, flexDirection: "row-reverse", gap: 8, justifyContent: "center", minHeight: 47 }, playText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  attachmentsCard: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 19, borderWidth: 1, gap: 11, padding: 14 }, attachmentsHeader: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" }, attachmentActions: { flexDirection: "row-reverse", gap: 7 }, attachmentAction: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 11, flex: 1, gap: 4, justifyContent: "center", minHeight: 57, paddingHorizontal: 3 }, attachmentActionText: { color: appTheme.primary, fontSize: 10, fontWeight: "800", textAlign: "center" }, attachmentRow: { alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 12, flexDirection: "row-reverse", gap: 7, padding: 9 }, attachmentOpen: { alignItems: "center", flex: 1, flexDirection: "row-reverse", gap: 7 }, attachmentTitle: { color: appTheme.ink, flex: 1, fontSize: 12, fontWeight: "700", textAlign: "right" }, attachmentDelete: { alignItems: "center", backgroundColor: appTheme.dangerSoft, borderRadius: 9, height: 29, justifyContent: "center", width: 29 },
  exportButton: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderColor: "#C7D2FE", borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", gap: 8, justifyContent: "center", minHeight: 48 }, exportText: { color: appTheme.primary, fontSize: 14, fontWeight: "800" }, disabled: { opacity: 0.45 }, sectionHeader: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 3 }, sectionTitle: { color: appTheme.ink, fontSize: 19, fontWeight: "800" }, transcriptCard: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, padding: 16 }, transcript: { color: appTheme.ink, fontSize: 15, lineHeight: 27, textAlign: "right" }, segmentLine: { alignItems: "flex-start", borderBottomColor: appTheme.border, borderBottomWidth: 1, flexDirection: "row-reverse", gap: 8, paddingVertical: 10 }, segmentText: { color: appTheme.ink, flex: 1, fontSize: 14, lineHeight: 22, textAlign: "right" }, segmentTime: { color: appTheme.primary, fontSize: 11, fontVariant: ["tabular-nums"], marginTop: 3 }, actionCard: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 19, borderWidth: 1, gap: 12, padding: 17 }, actionCopy: { alignItems: "flex-end", width: "100%" }, actionTitle: { color: appTheme.ink, fontSize: 16, fontWeight: "800", textAlign: "right" }, actionBody: { color: appTheme.muted, fontSize: 12, lineHeight: 19, textAlign: "right" }, progressNotice: { alignSelf: "stretch", gap: 8 }, progressTrackLight: { backgroundColor: "#E2E8F0", borderRadius: 5, height: 7, overflow: "hidden" }, progressFillLight: { backgroundColor: appTheme.primary, borderRadius: 5, height: 7 }, progressNoticeText: { color: appTheme.primary, fontSize: 12, fontWeight: "700", textAlign: "center" }, reviewAction: { marginTop: -8 },
  summaryCard: { backgroundColor: "#F8FAFF", borderColor: "#C7D2FE", borderRadius: 19, borderWidth: 1, gap: 19, padding: 17 }, summaryOverview: { color: appTheme.ink, fontSize: 15, fontWeight: "600", lineHeight: 25, textAlign: "right" }, summaryGroup: { gap: 9 }, summaryHeading: { alignItems: "center", flexDirection: "row-reverse", gap: 7 }, summaryTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800" }, summaryItem: { alignItems: "flex-start", flexDirection: "row-reverse", gap: 8 }, bullet: { backgroundColor: appTheme.primary, borderRadius: 4, height: 6, marginTop: 8, width: 6 }, summaryItemText: { color: "#334155", flex: 1, fontSize: 13, lineHeight: 20, textAlign: "right" }, tags: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }, tag: { backgroundColor: "#E0E7FF", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 }, tagText: { color: appTheme.primary, fontSize: 12, fontWeight: "700" }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
});
