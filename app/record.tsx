import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";

import { AppHeader, EmptyState, IconButton, PrimaryButton, StatusPill } from "@/components/study-ui";
import { appTheme } from "@/lib/app-theme";
import { isSupportedAudioFile, titleFromImportedAudioFile } from "@/lib/import-recording";
import { useStudy } from "@/lib/study-context";
import type { LectureAudioPart, SubjectSection } from "@/lib/study-types";
import { getRecordingExitIntent, getRecordingPartHint } from "@/lib/recording-stability";
import { ScreenContainer } from "@/components/screen-container";

export default function RecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectId?: string; section?: SubjectSection }>();
  const { subjects, terms, years, getSubject, getTerm, getYear, addLecture, syncSettings } = useStudy();
  const autoPartDurationSeconds = Math.max(5, Math.min(60, syncSettings.recordingPartMinutes ?? 20)) * 60;
  const [selectedSubjectId, setSelectedSubjectId] = useState(params.subjectId ?? "");
  const [selectedSection, setSelectedSection] = useState<SubjectSection>(params.section === "practical" ? "practical" : "theory");
  const [selectingDestination, setSelectingDestination] = useState(!params.subjectId);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [audioParts, setAudioParts] = useState<LectureAudioPart[]>([]);
  const [finalized, setFinalized] = useState(false);
  const [partTransitioning, setPartTransitioning] = useState(false);
  const [title, setTitle] = useState("");
  const startedAt = useRef<number | null>(null);
  const isSwitchingPart = useRef(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const selectedSubject = getSubject(selectedSubjectId);
  const destinationLabel = useMemo(() => {
    if (!selectedSubject) return "اختر مادة وقسماً للحفظ";
    const term = getTerm(selectedSubject.termId);
    const year = term ? getYear(term.yearId) : undefined;
    return `${year?.title ?? "سنة"} · ${term?.title ?? "ترم"} · ${selectedSubject.title}`;
  }, [getTerm, getYear, selectedSubject]);

  useEffect(() => {
    if (!recorderState.isRecording) return;
    const timer = setInterval(() => {
      if (startedAt.current) setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt.current) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [recorderState.isRecording]);

  useEffect(() => {
    if (!selectedSubject?.hasPracticalSection && selectedSection === "practical") setSelectedSection("theory");
  }, [selectedSection, selectedSubject?.hasPracticalSection]);

  const startRecording = async () => {
    if (!selectedSubject) { setSelectingDestination(true); return; }
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) { Alert.alert("نحتاج إذن الميكروفون", "اسمح بالوصول إلى الميكروفون لتسجيل المحاضرة."); return; }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      setElapsedSeconds(0); setTotalElapsedSeconds(0); setAudioParts([]); setFinalized(false);
    } catch { Alert.alert("تعذر بدء التسجيل", "تحقق من إذن الميكروفون ثم حاول مجدداً."); }
  };

  const finishCurrentPart = useCallback(async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("لا يوجد ملف مسجل.");
      const persistedUri = await persistRecording(uri);
      const durationSeconds = startedAt.current ? Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000)) : 1;
      const part: LectureAudioPart = { id: `part-${Date.now()}`, index: audioParts.length + 1, uri: persistedUri, durationSeconds, sizeBytes: new File(persistedUri).size ?? 0, createdAt: new Date().toISOString() };
      setAudioParts((current) => [...current, part]);
      setTotalElapsedSeconds((current) => current + durationSeconds);
      setElapsedSeconds(0);
      startedAt.current = null;
      return part;
    } catch { Alert.alert("تعذر حفظ التسجيل", "حاول تسجيل هذا الجزء مرة أخرى."); return null; }
  }, [audioParts.length, recorder]);

  const stopRecording = async () => {
    if (partTransitioning) return;
    const part = await finishCurrentPart();
    if (!part) return;
    setFinalized(true);
    setTitle(`محاضرة ${new Date().toLocaleDateString("ar", { month: "long", day: "numeric" })}`);
  };

  const nextPart = useCallback(async () => {
    if (isSwitchingPart.current) return;
    isSwitchingPart.current = true;
    setPartTransitioning(true);
    try {
      const part = await finishCurrentPart();
      if (!part) return;
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
    } catch { Alert.alert("حُفظ الجزء", "تعذر بدء الجزء التالي. يمكنك إنهاء المحاضرة وحفظ الأجزاء المسجلة."); setFinalized(true); }
    finally { isSwitchingPart.current = false; setPartTransitioning(false); }
  }, [finishCurrentPart, recorder]);

  useEffect(() => {
    if (!recorderState.isRecording || elapsedSeconds < autoPartDurationSeconds || isSwitchingPart.current) return;
    void nextPart();
  }, [autoPartDurationSeconds, elapsedSeconds, nextPart, recorderState.isRecording]);

  const importRecording = async () => {
    if (!selectedSubject) { setSelectingDestination(true); return; }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!isSupportedAudioFile(asset.mimeType, asset.name)) { Alert.alert("ملف غير مدعوم", "اختر ملفاً صوتياً صالحاً مثل M4A أو MP3 أو WAV."); return; }
      const persistedUri = await persistRecording(asset.uri);
      const sizeBytes = new File(persistedUri).size ?? asset.size ?? 0;
      const part: LectureAudioPart = { id: `imported-${Date.now()}`, index: 1, uri: persistedUri, durationSeconds: 0, sizeBytes, createdAt: new Date().toISOString() };
      const lectureId = addLecture({ subjectId: selectedSubject.id, section: selectedSection, title: titleFromImportedAudioFile(asset.name), durationSeconds: 0, audioUri: persistedUri, audioSizeBytes: sizeBytes, audioParts: [part] });
      router.replace({ pathname: "/lecture/[lectureId]", params: { lectureId } });
    } catch (error) { Alert.alert("تعذر استيراد التسجيل", error instanceof Error ? error.message : "حاول اختيار الملف مرة أخرى."); }
  };

  const saveRecording = () => {
    if (!selectedSubject || !audioParts.length) return;
    const lectureId = addLecture({
      subjectId: selectedSubject.id,
      section: selectedSection,
      title: title.trim() || "محاضرة جديدة",
      durationSeconds: totalElapsedSeconds,
      audioUri: audioParts[0]?.uri,
      audioSizeBytes: audioParts.reduce((sum, part) => sum + (part.sizeBytes ?? 0), 0),
      audioParts,
    });
    router.replace({ pathname: "/lecture/[lectureId]", params: { lectureId } });
  };

  const requestClose = () => {
    const intent = getRecordingExitIntent({ isRecording: recorderState.isRecording, isTransitioningPart: partTransitioning, finalized, partCount: audioParts.length });
    if (intent === "finish-recording") { Alert.alert("التسجيل قيد الحفظ", "أنه المحاضرة أولاً حتى نضمن حفظ الجزء الصوتي الحالي، ثم اختر حفظ المحاضرة أو المتابعة في العنوان.", [{ text: "متابعة التسجيل", style: "cancel" }, { text: "إنهاء التسجيل", onPress: () => void stopRecording() }]); return; }
    if (intent === "save-recording") { Alert.alert("احفظ المحاضرة أولاً", "لديك أجزاء صوتية جاهزة. احفظ المحاضرة قبل الخروج حتى تظهر في مكتبتك.", [{ text: "متابعة التحرير", style: "cancel" }, { text: "حفظ المحاضرة", onPress: saveRecording }]); return; }
    router.back();
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}>
      <AppHeader eyebrow="محاضرة جديدة" title="تسجيل صوتي" action={<IconButton icon="close" label="إغلاق" onPress={requestClose} tone="neutral" />} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => !recorderState.isRecording && setSelectingDestination(true)} style={({ pressed }) => [styles.destination, pressed && !recorderState.isRecording && styles.pressed]}>
          <View style={styles.destinationIcon}><MaterialIcons name="folder-open" size={22} color={appTheme.primary} /></View>
          <View style={styles.destinationText}><Text style={styles.destinationLabel}>وجهة الحفظ</Text><Text style={styles.destinationValue} numberOfLines={2}>{destinationLabel}</Text></View>
          <MaterialIcons name="chevron-left" size={23} color="#94A3B8" />
        </Pressable>
        {selectedSubject?.hasPracticalSection ? <View style={styles.sectionRow}><SectionButton label="نظري" active={selectedSection === "theory"} disabled={recorderState.isRecording} onPress={() => setSelectedSection("theory")} /><SectionButton label="عملي" active={selectedSection === "practical"} disabled={recorderState.isRecording} onPress={() => setSelectedSection("practical")} /></View> : null}
        <View style={[styles.recorderCard, recorderState.isRecording && styles.recorderCardActive]}>
          <View style={[styles.recordOrb, recorderState.isRecording && styles.recordOrbLive]}><MaterialIcons name={recorderState.isRecording ? "stop" : finalized ? "check" : "mic"} size={38} color="#FFFFFF" /></View>
          <Text style={styles.timer}>{formatDuration(totalElapsedSeconds + elapsedSeconds)}</Text>
          <View style={styles.recordStatus}>{recorderState.isRecording ? <><View style={styles.liveDot} /><Text style={styles.liveText}>الجزء {audioParts.length + 1} قيد التسجيل</Text></> : finalized ? <StatusPill label={`${audioParts.length} أجزاء جاهزة للحفظ`} tone="success" /> : <Text style={styles.readyText}>اختر الوجهة ثم ابدأ التسجيل</Text>}</View>
          {!finalized ? <><PrimaryButton label={recorderState.isRecording ? "إنهاء المحاضرة" : "بدء التسجيل"} icon={recorderState.isRecording ? "stop" : "mic"} disabled={partTransitioning} onPress={recorderState.isRecording ? stopRecording : startRecording} />{recorderState.isRecording ? <Pressable disabled={partTransitioning} onPress={() => void nextPart()} style={[styles.segmentButton, partTransitioning && styles.disabled]}><MaterialIcons name="call-split" size={18} color={appTheme.primary} /><Text style={styles.segmentButtonText}>{partTransitioning ? "يجري حفظ الجزء" : "إنهاء الجزء وبدء جزء جديد"}</Text></Pressable> : <Pressable onPress={() => void importRecording()} style={styles.importButton}><MaterialIcons name="file-upload" size={18} color={appTheme.primary} /><Text style={styles.importButtonText}>استيراد تسجيل سابق</Text></Pressable>}</> : null}
        </View>
        {finalized ? <View style={styles.savePanel}><Text style={styles.saveLabel}>عنوان المحاضرة</Text><TextInput value={title} onChangeText={setTitle} style={styles.titleInput} textAlign="right" placeholder="مثال: المحاضرة الثالثة" placeholderTextColor="#94A3B8" returnKeyType="done" /><Text style={styles.partHint}>{getRecordingPartHint(syncSettings.recordingPartMinutes ?? 20)}</Text><PrimaryButton label="حفظ المحاضرة" icon="save" onPress={saveRecording} /></View> : null}
        <View style={styles.privacy}><MaterialIcons name="verified-user" size={18} color={appTheme.success} /><Text style={styles.privacyText}>يبقى التسجيل على جهازك. لن يُرسل للمعالجة الذكية إلا عندما تختار التحويل إلى نص.</Text></View>
      </ScrollView>
      <DestinationPicker visible={selectingDestination} subjects={subjects} terms={terms} years={years} selectedSubjectId={selectedSubjectId} section={selectedSection} onClose={() => setSelectingDestination(false)} onPick={(subjectId, section) => { setSelectedSubjectId(subjectId); setSelectedSection(section); setSelectingDestination(false); }} onOpenStudy={() => { setSelectingDestination(false); router.replace("/study"); }} />
    </ScreenContainer>
  );
}

function DestinationPicker({ visible, subjects, terms, years, selectedSubjectId, section, onClose, onPick, onOpenStudy }: { visible: boolean; subjects: ReturnType<typeof useStudy>["subjects"]; terms: ReturnType<typeof useStudy>["terms"]; years: ReturnType<typeof useStudy>["years"]; selectedSubjectId: string; section: SubjectSection; onClose: () => void; onPick: (subjectId: string, section: SubjectSection) => void; onOpenStudy: () => void }) {
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><View style={styles.sheet}><View style={styles.sheetHeader}><IconButton icon="close" label="إغلاق" onPress={onClose} tone="neutral" /><Text style={styles.sheetTitle}>اختر وجهة الحفظ</Text><View style={styles.headerSpacer} /></View>{subjects.length === 0 ? <View style={styles.sheetEmpty}><EmptyState icon="menu-book" title="أضف مادة أولاً" description="لنحفظ التسجيل في مكانه الصحيح، أنشئ سنة وترماً ومادة قبل بدء التسجيل." action={<PrimaryButton label="الانتقال إلى دراستي" icon="account-tree" onPress={onOpenStudy} />} /></View> : <ScrollView contentContainerStyle={styles.pickerList}>{subjects.map((subject) => { const term = terms.find((item) => item.id === subject.termId); const year = years.find((item) => item.id === term?.yearId); const selected = selectedSubjectId === subject.id; return <View key={subject.id} style={[styles.pickerCard, selected && styles.pickerCardSelected]}><Pressable onPress={() => onPick(subject.id, "theory")} style={({ pressed }) => [styles.pickerSubject, pressed && styles.pressed]}><View style={[styles.pickerColor, { backgroundColor: subject.color }]} /><View style={styles.pickerText}><Text style={styles.pickerSubjectTitle}>{subject.title}</Text><Text style={styles.pickerMeta}>{year?.title} · {term?.title}</Text></View><Text style={styles.pickAction}>اختيار</Text></Pressable>{subject.hasPracticalSection ? <View style={styles.pickerSections}><Pressable onPress={() => onPick(subject.id, "theory")} style={[styles.pickerSection, selected && section === "theory" && styles.pickerSectionActive]}><Text style={[styles.pickerSectionText, selected && section === "theory" && styles.pickerSectionTextActive]}>حفظ في النظري</Text></Pressable><Pressable onPress={() => onPick(subject.id, "practical")} style={[styles.pickerSection, selected && section === "practical" && styles.pickerSectionActive]}><Text style={[styles.pickerSectionText, selected && section === "practical" && styles.pickerSectionTextActive]}>حفظ في العملي</Text></Pressable></View> : null}</View>; })}</ScrollView>}</View></Modal>;
}

function SectionButton({ label, active, disabled, onPress }: { label: string; active: boolean; disabled: boolean; onPress: () => void }) { return <Pressable disabled={disabled} onPress={onPress} style={[styles.sectionButton, active && styles.sectionButtonActive, disabled && styles.sectionDisabled]}><Text style={[styles.sectionButtonText, active && styles.sectionButtonTextActive]}>{label}</Text></Pressable>; }

async function persistRecording(uri: string) {
  if (Platform.OS === "web") return uri;
  const recordingsDir = new Directory(Paths.document, "lectures");
  if (!recordingsDir.exists) recordingsDir.create({ intermediates: true });
  const source = new File(uri);
  const extension = uri.split(".").pop() || "m4a";
  const destination = new File(recordingsDir, `lecture-${Date.now()}.${extension}`);
  source.copy(destination);
  return destination.uri;
}

function formatDuration(seconds: number) { const minutes = Math.floor(seconds / 60).toString().padStart(2, "0"); const rest = (seconds % 60).toString().padStart(2, "0"); return `${minutes}:${rest}`; }

const styles = StyleSheet.create({
  content: { gap: 16, paddingBottom: 24 }, destination: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, flexDirection: "row-reverse", gap: 12, padding: 14 }, destinationIcon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 13, height: 43, justifyContent: "center", width: 43 }, destinationText: { flex: 1 }, destinationLabel: { color: appTheme.muted, fontSize: 12, fontWeight: "700", textAlign: "right" }, destinationValue: { color: appTheme.ink, fontSize: 14, fontWeight: "800", lineHeight: 20, marginTop: 3, textAlign: "right" },
  sectionRow: { backgroundColor: "#E2E8F0", borderRadius: 14, flexDirection: "row-reverse", gap: 4, padding: 4 }, sectionButton: { alignItems: "center", borderRadius: 10, flex: 1, minHeight: 38, justifyContent: "center" }, sectionButtonActive: { backgroundColor: appTheme.surface }, sectionButtonText: { color: appTheme.muted, fontSize: 14, fontWeight: "800" }, sectionButtonTextActive: { color: appTheme.primary }, sectionDisabled: { opacity: 0.55 },
  recorderCard: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 28, borderWidth: 1, padding: 28 }, recorderCardActive: { borderColor: "#FDA4AF", backgroundColor: "#FFF9FA" }, recordOrb: { alignItems: "center", backgroundColor: appTheme.primary, borderRadius: 50, height: 100, justifyContent: "center", width: 100 }, recordOrbLive: { backgroundColor: appTheme.danger }, timer: { color: appTheme.ink, fontSize: 42, fontVariant: ["tabular-nums"], fontWeight: "300", letterSpacing: 1, marginTop: 20 }, recordStatus: { alignItems: "center", flexDirection: "row-reverse", gap: 7, height: 36, justifyContent: "center", marginVertical: 10 }, liveDot: { backgroundColor: appTheme.danger, borderRadius: 5, height: 9, width: 9 }, liveText: { color: appTheme.danger, fontSize: 13, fontWeight: "800" }, readyText: { color: appTheme.muted, fontSize: 13 }, disabled: { opacity: 0.45 },
  savePanel: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 20, borderWidth: 1, gap: 10, padding: 16 }, saveLabel: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, titleInput: { backgroundColor: "#F8FAFC", borderColor: appTheme.border, borderRadius: 13, borderWidth: 1, color: appTheme.ink, fontSize: 15, minHeight: 50, paddingHorizontal: 13 }, partHint: { color: appTheme.muted, fontSize: 12, lineHeight: 18, textAlign: "right" }, importButton: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderColor: "#C7D2FE", borderRadius: 13, borderWidth: 1, flexDirection: "row-reverse", gap: 7, justifyContent: "center", marginTop: 9, minHeight: 44, paddingHorizontal: 12 }, importButtonText: { color: appTheme.primary, fontSize: 13, fontWeight: "800" }, segmentButton: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 13, flexDirection: "row-reverse", gap: 7, justifyContent: "center", marginTop: 9, minHeight: 44, paddingHorizontal: 12 }, segmentButtonText: { color: appTheme.primary, fontSize: 13, fontWeight: "800" }, privacy: { alignItems: "flex-start", backgroundColor: appTheme.successSoft, borderRadius: 16, flexDirection: "row-reverse", gap: 8, padding: 13 }, privacyText: { color: appTheme.success, flex: 1, fontSize: 12, lineHeight: 18, textAlign: "right" },
  sheet: { backgroundColor: appTheme.background, flex: 1 }, sheetHeader: { alignItems: "center", backgroundColor: appTheme.surface, borderBottomColor: appTheme.border, borderBottomWidth: 1, flexDirection: "row-reverse", justifyContent: "space-between", paddingBottom: 12, paddingHorizontal: 20, paddingTop: 16 }, sheetTitle: { color: appTheme.ink, fontSize: 18, fontWeight: "800" }, headerSpacer: { width: 58 }, sheetEmpty: { flex: 1, justifyContent: "center", padding: 20 }, pickerList: { gap: 12, padding: 20, paddingBottom: 36 }, pickerCard: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, overflow: "hidden" }, pickerCardSelected: { borderColor: "#818CF8", borderWidth: 2 }, pickerSubject: { alignItems: "center", flexDirection: "row-reverse", gap: 11, padding: 14 }, pickerColor: { borderRadius: 99, height: 12, width: 12 }, pickerText: { flex: 1 }, pickerSubjectTitle: { color: appTheme.ink, fontSize: 15, fontWeight: "800", textAlign: "right" }, pickerMeta: { color: appTheme.muted, fontSize: 11, marginTop: 3, textAlign: "right" }, pickAction: { color: appTheme.primary, fontSize: 12, fontWeight: "800" }, pickerSections: { borderTopColor: appTheme.border, borderTopWidth: 1, flexDirection: "row-reverse", gap: 8, padding: 10 }, pickerSection: { alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 10, flex: 1, padding: 9 }, pickerSectionActive: { backgroundColor: appTheme.primarySoft }, pickerSectionText: { color: appTheme.muted, fontSize: 12, fontWeight: "700" }, pickerSectionTextActive: { color: appTheme.primary }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
});
