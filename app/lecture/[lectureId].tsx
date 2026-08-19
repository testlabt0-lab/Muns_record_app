import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { File } from "expo-file-system";

import { AppHeader, EmptyState, IconButton, LoadingView, PrimaryButton, StatusPill } from "@/components/study-ui";
import { appTheme } from "@/lib/app-theme";
import { getApiBaseUrl } from "@/constants/oauth";
import { useStudy } from "@/lib/study-context";
import { trpc } from "@/lib/trpc";
import { ScreenContainer } from "@/components/screen-container";

export default function LectureDetailScreen() {
  const router = useRouter();
  const { lectureId } = useLocalSearchParams<{ lectureId: string }>();
  const { hydrated, lectures, getSubject, updateLecture } = useStudy();
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
      if (file.size > 16 * 1024 * 1024) { Alert.alert("التسجيل كبير جداً", "قسّم التسجيل إلى أجزاء أصغر من 16 ميغابايت ثم أعد المحاولة."); return; }
      const apiBaseUrl = getApiBaseUrl();
      if (!apiBaseUrl) throw new Error("تعذر الوصول إلى خدمة التحويل. افتح التطبيق من الهاتف عبر رمز QR أو تحقق من اتصال الشبكة.");
      setIsTranscribing(true); updateLecture(lecture.id, { transcriptionStatus: "processing" });
      const response = await fetch(`${apiBaseUrl}/api/lectures/transcribe`, { method: "POST", headers: { "Content-Type": file.type || "audio/m4a" }, body: file });
      const payload = await response.json() as { text?: string; error?: string };
      if (!response.ok || !payload.text) throw new Error(payload.error || "تعذر استخراج النص.");
      updateLecture(lecture.id, { transcript: payload.text, transcriptionStatus: "completed", summaryStatus: "ready" });
    } catch (error) { updateLecture(lecture.id, { transcriptionStatus: "failed" }); Alert.alert("تعذر تحويل التسجيل", error instanceof Error ? error.message : "أعد المحاولة لاحقاً."); }
    finally { setIsTranscribing(false); }
  };
  const createSummary = async () => {
    if (!lecture.transcript) return;
    try {
      updateLecture(lecture.id, { summaryStatus: "processing" });
      const summary = await summarize.mutateAsync({ transcript: lecture.transcript, language: "ar" });
      updateLecture(lecture.id, { summary, summaryStatus: "completed" });
    } catch (error) { updateLecture(lecture.id, { summaryStatus: "failed" }); Alert.alert("تعذر إنشاء الملخص", error instanceof Error ? error.message : "أعد المحاولة لاحقاً."); }
  };
  const statusTone = lecture.transcriptionStatus === "completed" ? "success" : lecture.transcriptionStatus === "processing" ? "warning" : "neutral";
  const statusText = lecture.transcriptionStatus === "completed" ? "تم التحويل إلى نص" : lecture.transcriptionStatus === "processing" ? "يجري التحويل" : lecture.transcriptionStatus === "failed" ? "فشل التحويل" : "محفوظ محلياً";
  return <ScreenContainer className="px-5"><AppHeader eyebrow={subject?.title ?? "محاضرة"} title={lecture.title} action={<IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} tone="neutral" />} /><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.audioCard}><View style={styles.audioTop}><StatusPill label={lecture.section === "theory" ? "نظري" : "عملي"} tone="primary" /><Text style={styles.date}>{new Date(lecture.recordedAt).toLocaleDateString("ar", { month: "long", day: "numeric" })}</Text></View><View style={styles.wave}><View style={[styles.waveLine, { height: 18 }]} /><View style={[styles.waveLine, { height: 30 }]} /><View style={[styles.waveLine, { height: 46 }]} /><View style={[styles.waveLine, { height: 25 }]} /><View style={[styles.waveLine, { height: 54 }]} /><View style={[styles.waveLine, { height: 34 }]} /><View style={[styles.waveLine, { height: 20 }]} /></View><View style={styles.playRow}><Text style={styles.duration}>{formatDuration(Math.floor(playerStatus.duration || lecture.durationSeconds))}</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, playerStatus.duration ? (playerStatus.currentTime / playerStatus.duration) * 100 : 0)}%` }]} /></View><Text style={styles.duration}>{formatDuration(Math.floor(playerStatus.currentTime || 0))}</Text></View><Pressable onPress={togglePlayback} style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}><MaterialIcons name={playerStatus.playing ? "pause" : "play-arrow"} size={27} color="#FFFFFF" /><Text style={styles.playText}>{playerStatus.playing ? "إيقاف مؤقت" : "تشغيل التسجيل"}</Text></Pressable></View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>النص</Text><StatusPill label={statusText} tone={statusTone} /></View>
    {lecture.transcript ? <View style={styles.transcriptCard}><Text style={styles.transcript}>{lecture.transcript}</Text></View> : <View style={styles.actionCard}><MaterialIcons name="auto-awesome" size={25} color={appTheme.primary} /><View style={styles.actionCopy}><Text style={styles.actionTitle}>حوّل التسجيل إلى نص</Text><Text style={styles.actionBody}>يُرفع التسجيل عند اختيارك لهذه الخطوة فقط ثم يحفظ النص مع المحاضرة.</Text></View><PrimaryButton label={isTranscribing ? "يجري التحويل" : "تحويل إلى نص"} icon="text-snippet" disabled={isTranscribing} onPress={transcribe} /></View>}
    {lecture.transcript ? <><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>الملخص الذكي</Text>{lecture.summary ? <StatusPill label="جاهز للمراجعة" tone="success" /> : null}</View>{lecture.summary ? <SummaryView summary={lecture.summary} /> : <View style={styles.actionCard}><MaterialIcons name="psychology" size={25} color={appTheme.violet} /><View style={styles.actionCopy}><Text style={styles.actionTitle}>رتّب أهم ما في المحاضرة</Text><Text style={styles.actionBody}>ينشئ ملخصاً ونقاطاً ومصطلحات وأسئلة مراجعة من النص.</Text></View><PrimaryButton label={summarize.isPending ? "يجري التلخيص" : "إنشاء ملخص"} icon="auto-awesome" disabled={summarize.isPending} onPress={createSummary} /></View>}</> : null}
  </ScrollView></ScreenContainer>;
}

function SummaryView({ summary }: { summary: NonNullable<ReturnType<typeof useStudy>["lectures"][number]["summary"]> }) { return <View style={styles.summaryCard}><Text style={styles.summaryOverview}>{summary.overview}</Text><SummaryGroup title="أهم النقاط" icon="format-list-bulleted" items={summary.keyPoints} /><SummaryGroup title="مصطلحات مهمة" icon="label-outline" items={summary.terms} compact /><SummaryGroup title="أسئلة للمراجعة" icon="help-outline" items={summary.reviewQuestions} /></View>; }
function SummaryGroup({ title, icon, items, compact = false }: { title: string; icon: React.ComponentProps<typeof MaterialIcons>["name"]; items: string[]; compact?: boolean }) { return <View style={styles.summaryGroup}><View style={styles.summaryHeading}><MaterialIcons name={icon} size={17} color={appTheme.primary} /><Text style={styles.summaryTitle}>{title}</Text></View>{compact ? <View style={styles.tags}>{items.map((item) => <View key={item} style={styles.tag}><Text style={styles.tagText}>{item}</Text></View>)}</View> : items.map((item, index) => <View key={`${item}-${index}`} style={styles.summaryItem}><View style={styles.bullet} /><Text style={styles.summaryItemText}>{item}</Text></View>)}</View>; }
function formatDuration(seconds: number) { const minutes = Math.floor(seconds / 60).toString().padStart(2, "0"); const rest = (seconds % 60).toString().padStart(2, "0"); return `${minutes}:${rest}`; }

const styles = StyleSheet.create({
  content: { gap: 17, paddingBottom: 32 }, audioCard: { backgroundColor: appTheme.ink, borderRadius: 25, padding: 19 }, audioTop: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" }, date: { color: "#CBD5E1", fontSize: 12 }, wave: { alignItems: "center", flexDirection: "row-reverse", gap: 7, height: 68, justifyContent: "center", marginTop: 10 }, waveLine: { backgroundColor: "#A5B4FC", borderRadius: 10, opacity: 0.9, width: 7 }, playRow: { alignItems: "center", flexDirection: "row-reverse", gap: 9, marginBottom: 15 }, duration: { color: "#CBD5E1", fontSize: 11, fontVariant: ["tabular-nums"] }, progressTrack: { backgroundColor: "#334155", borderRadius: 5, flex: 1, height: 5, overflow: "hidden" }, progressFill: { backgroundColor: "#A5B4FC", borderRadius: 5, height: 5 }, playButton: { alignItems: "center", backgroundColor: appTheme.primary, borderRadius: 14, flexDirection: "row-reverse", gap: 8, justifyContent: "center", minHeight: 47 }, playText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  sectionHeader: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 3 }, sectionTitle: { color: appTheme.ink, fontSize: 19, fontWeight: "800" }, transcriptCard: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, padding: 16 }, transcript: { color: appTheme.ink, fontSize: 15, lineHeight: 27, textAlign: "right" }, actionCard: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 19, borderWidth: 1, gap: 12, padding: 17 }, actionCopy: { alignItems: "flex-end", width: "100%" }, actionTitle: { color: appTheme.ink, fontSize: 16, fontWeight: "800", textAlign: "right" }, actionBody: { color: appTheme.muted, fontSize: 12, lineHeight: 19, marginTop: 4, textAlign: "right" },
  summaryCard: { backgroundColor: "#F8FAFF", borderColor: "#C7D2FE", borderRadius: 19, borderWidth: 1, gap: 19, padding: 17 }, summaryOverview: { color: appTheme.ink, fontSize: 15, fontWeight: "600", lineHeight: 25, textAlign: "right" }, summaryGroup: { gap: 9 }, summaryHeading: { alignItems: "center", flexDirection: "row-reverse", gap: 7 }, summaryTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800" }, summaryItem: { alignItems: "flex-start", flexDirection: "row-reverse", gap: 8 }, bullet: { backgroundColor: appTheme.primary, borderRadius: 4, height: 6, marginTop: 8, width: 6 }, summaryItemText: { color: "#334155", flex: 1, fontSize: 13, lineHeight: 20, textAlign: "right" }, tags: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }, tag: { backgroundColor: "#E0E7FF", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 }, tagText: { color: appTheme.primary, fontSize: 12, fontWeight: "700" }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
});
