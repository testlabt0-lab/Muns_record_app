import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { File } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { AppHeader, EmptyState, IconButton, LoadingView, PrimaryButton, StatusPill } from "@/components/study-ui";
import { getApiBaseUrl, startOAuthLogin } from "@/constants/oauth";
import { appTheme } from "@/lib/app-theme";
import { applyDetectedDuration } from "@/lib/audio-duration";
import { exportLecturePdf } from "@/lib/lecture-export";
import { createLinkedLectureNote, createReviewCardFromLinkedNote, getLectureReviewSourceSummary } from "@/lib/lecture-linked-notes";
import { normalizeBookmark } from "@/lib/lecture-bookmarks";
import { getLectureTranscript, getTranscriptLanguageLabel, normalizeEditedTranscript, TRANSCRIPT_LANGUAGE_OPTIONS } from "@/lib/lecture-transcript";
import { createSummaryVersion, getLectureSummaryVersions, getSummaryStyleLabel, validateLectureSummaryDraft } from "@/lib/lecture-summaries";
import { attachmentKindFromMime, persistAttachment } from "@/lib/local-attachments";
import { getAttachmentExtractionError, isImageExtractionSupported } from "@/lib/attachment-extraction";
import type { LectureAttachment, LectureSummary, TranscriptLanguage } from "@/lib/study-types";
import { SUMMARY_STYLES, type SummaryStyle } from "@/shared/summary-style";
import { useStudy } from "@/lib/study-context";
import { notifyBackupOutcome } from "@/lib/study-reminders";
import { buildMergedTranscript, getTranscriptionProgress, mergeTranscribedPart } from "@/lib/transcription-progress";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { ScreenContainer } from "@/components/screen-container";

type BackupUploadItem = { sourceId: string; uri: string; name: string; contentType: string; sizeBytes?: number };
const TAG_COLORS = ["#4F46E5", "#0891B2", "#16A34A", "#D97706", "#DC2626", "#9333EA"];
const TAG_TEMPLATES = [{ label: "مهم", color: "#DC2626" }, { label: "امتحان", color: "#D97706" }, { label: "تعريف", color: "#0891B2" }, { label: "مشروع", color: "#9333EA" }, { label: "مراجعة", color: "#16A34A" }];

export default function LectureDetailScreen() {
  const router = useRouter();
  const { lectureId, seekSeconds } = useLocalSearchParams<{ lectureId: string; seekSeconds?: string }>();
  const { hydrated, lectures, getSubject, updateLecture, addReviewCards, reviewCards, addAttachment, removeAttachment, updateAttachment, syncSettings, updateSyncSettings, addBackupActivity } = useStudy();
  const lecture = lectures.find((item) => item.id === lectureId);
  const subject = lecture ? getSubject(lecture.subjectId) : undefined;
  const audioParts = useMemo(() => lecture?.audioParts?.length ? lecture.audioParts : lecture?.audioUri ? [{ id: `${lecture.id}-legacy`, index: 1, uri: lecture.audioUri, durationSeconds: lecture.durationSeconds, sizeBytes: lecture.audioSizeBytes, createdAt: lecture.recordedAt }] : [], [lecture]);
  const [activePartIndex, setActivePartIndex] = useState(0);
  const [pendingPlayback, setPendingPlayback] = useState<{ seekSeconds: number; play: boolean } | null>(null);
  const player = useAudioPlayer(audioParts[activePartIndex]?.uri ?? lecture?.audioUri ?? null);
  const playerStatus = useAudioPlayerStatus(player);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const summarize = trpc.lectures.summarize.useMutation();
  const encryptedUpload = trpc.encryptedMedia.upload.useMutation();
  const extractImageText = trpc.attachments.extractImageText.useMutation();
  const { isAuthenticated } = useAuth();
  const [playbackRate, setPlaybackRate] = useState(syncSettings.preferredPlaybackRate ?? 1);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [uploadQueue, setUploadQueue] = useState<BackupUploadItem[]>([]);
  const [uploadIndex, setUploadIndex] = useState(0);
  const [uploadPaused, setUploadPaused] = useState(false);
  const [failedUploadItem, setFailedUploadItem] = useState<BackupUploadItem | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [isTranscriptEditing, setIsTranscriptEditing] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [showOriginalSegments, setShowOriginalSegments] = useState(false);
  const [summaryStyle, setSummaryStyle] = useState<SummaryStyle>("quick");
  const [isSummaryEditing, setIsSummaryEditing] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState({ overview: "", keyPoints: "", terms: "", reviewQuestions: "" });
  const [linkedNoteDraft, setLinkedNoteDraft] = useState("");
  const pauseRequested = useRef(false);
  const appliedSearchSeek = useRef<string | undefined>(undefined);

  useEffect(() => { void setAudioModeAsync({ playsInSilentMode: true }); }, []);
  useEffect(() => { player.setPlaybackRate(syncSettings.preferredPlaybackRate ?? 1); setPlaybackRate(syncSettings.preferredPlaybackRate ?? 1); }, [player, syncSettings.preferredPlaybackRate]);
  useEffect(() => () => player.release(), [player]);
  useEffect(() => {
    const source = audioParts[activePartIndex]?.uri;
    if (!source) return;
    player.replace(source);
    if (pendingPlayback) {
      void player.seekTo(Math.max(0, pendingPlayback.seekSeconds)).then(() => { if (pendingPlayback.play) player.play(); });
      setPendingPlayback(null);
    }
  }, [activePartIndex, audioParts, pendingPlayback, player]);
  useEffect(() => {
    if (!playerStatus.didJustFinish || activePartIndex >= audioParts.length - 1) return;
    setPendingPlayback({ seekSeconds: 0, play: true });
    setActivePartIndex((current) => current + 1);
  }, [activePartIndex, audioParts.length, playerStatus.didJustFinish]);
  useEffect(() => {
    if (!lecture) return;
    const update = applyDetectedDuration(audioParts, activePartIndex, playerStatus.duration);
    if (update) updateLecture(lecture.id, update);
  }, [activePartIndex, audioParts, lecture, playerStatus.duration, updateLecture]);
  useEffect(() => {
    const requestedSeconds = Number(seekSeconds);
    if (!lecture || !seekSeconds || !Number.isFinite(requestedSeconds) || requestedSeconds < 0 || appliedSearchSeek.current === seekSeconds) return;
    let offset = 0;
    for (let index = 0; index < audioParts.length; index += 1) {
      const duration = audioParts[index].durationSeconds;
      if (requestedSeconds < offset + duration || index === audioParts.length - 1) {
        player.pause();
        setPendingPlayback({ seekSeconds: Math.max(0, requestedSeconds - offset), play: true });
        setActivePartIndex(index);
        appliedSearchSeek.current = seekSeconds;
        return;
      }
      offset += duration;
    }
  }, [audioParts, lecture, player, seekSeconds]);
  if (!hydrated) return <ScreenContainer><LoadingView /></ScreenContainer>;
  if (!lecture) return <ScreenContainer className="p-5"><AppHeader title="المحاضرة" action={<IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} />} /><EmptyState icon="error-outline" title="لم نجد هذه المحاضرة" description="ارجع إلى المادة واختر محاضرة متاحة." /></ScreenContainer>;
  const summaryVersions = getLectureSummaryVersions(lecture);
  const activeSummaryVersion = summaryVersions.find((version) => version.id === lecture.activeSummaryVersionId) ?? summaryVersions.at(-1);
  const activeSummary = activeSummaryVersion?.summary ?? lecture.summary;
  const reviewSources = getLectureReviewSourceSummary({ ...lecture, summary: activeSummary });

  const togglePlayback = () => {
    if (playerStatus.playing) { player.pause(); return; }
    if (playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration) player.seekTo(0);
    player.play();
  };

  const selectPart = (index: number, seekSeconds = 0, play = false) => {
    if (index < 0 || index >= audioParts.length) return;
    player.pause();
    setPendingPlayback({ seekSeconds, play });
    setActivePartIndex(index);
  };

  const selectPlaybackRate = (rate: number) => {
    player.setPlaybackRate(rate);
    setPlaybackRate(rate);
    updateSyncSettings({ preferredPlaybackRate: rate });
  };

  const playTranscriptSegment = (startSeconds: number) => {
    let offset = 0;
    for (let index = 0; index < audioParts.length; index += 1) {
      const duration = audioParts[index].durationSeconds;
      if (startSeconds < offset + duration || index === audioParts.length - 1) { selectPart(index, Math.max(0, startSeconds - offset), true); return; }
      offset += duration;
    }
  };

  const addBookmark = () => {
    if (!activePart) { Alert.alert("لا يوجد تسجيل", "أضف أو سجّل ملفًا صوتيًا قبل حفظ إشارة زمنية."); return; }
    const partOffset = audioParts.slice(0, activePartIndex).reduce((total, part) => total + part.durationSeconds, 0);
    const normalized = normalizeBookmark(bookmarkLabel, playerStatus.currentTime, playerStatus.duration || activePart.durationSeconds);
    const seconds = partOffset + normalized.seconds;
    if ((lecture.bookmarks ?? []).some((bookmark) => Math.abs(bookmark.seconds - seconds) < 1)) { Alert.alert("الإشارة موجودة", "توجد إشارة محفوظة عند هذا الموضع تقريبًا."); return; }
    updateLecture(lecture.id, { bookmarks: [...(lecture.bookmarks ?? []), { id: `bookmark-${Date.now()}`, ...normalized, seconds, createdAt: new Date().toISOString() }] });
    setBookmarkLabel("");
  };

  const removeBookmark = (bookmarkId: string) => updateLecture(lecture.id, { bookmarks: (lecture.bookmarks ?? []).filter((bookmark) => bookmark.id !== bookmarkId) });

  const transcribe = async () => {
    const parts = lecture.audioParts?.length ? lecture.audioParts : lecture.audioUri ? [{ id: `${lecture.id}-legacy`, index: 1, uri: lecture.audioUri, durationSeconds: lecture.durationSeconds }] : [];
    if (!parts.length) return;
    if (Platform.OS === "web") { Alert.alert("استخدم التطبيق على الهاتف", "يتطلب رفع التسجيل الحقيقي تجربة الهاتف عبر Expo Go أو نسخة التطبيق المبنية."); return; }
    const sourceIds = parts.map((part) => part.id);
    let completedParts = (lecture.transcribedAudioParts ?? []).filter((part) => sourceIds.includes(part.sourceId));
    try {
      const apiBaseUrl = getApiBaseUrl();
      if (!apiBaseUrl) throw new Error("تعذر الوصول إلى خدمة التحويل. افتح التطبيق عبر رمز QR أو تحقق من اتصال الشبكة.");
      setIsTranscribing(true);
      const completedIds = new Set(completedParts.map((part) => part.sourceId));
      const remainingParts = parts.filter((part) => !completedIds.has(part.id));
      updateLecture(lecture.id, { transcriptionStatus: "processing", transcriptionProgress: getTranscriptionProgress(completedParts, parts.length), retryReason: undefined });
      for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index];
        if (completedIds.has(part.id)) continue;
        const file = new File(part.uri);
        if (!file.exists) throw new Error(`لم يعد الجزء ${index + 1} من التسجيل متاحاً على الجهاز.`);
        if (file.size > 16 * 1024 * 1024) throw new Error(`الجزء ${index + 1} أكبر من 16 ميغابايت. أنشئ أجزاء أقصر ثم أعد المحاولة.`);
        const offsetSeconds = parts.slice(0, index).reduce((sum, entry) => sum + entry.durationSeconds, 0);
        updateLecture(lecture.id, { transcriptionProgress: Math.max(1, Math.round(((completedParts.length + 0.25) / parts.length) * 100)) });
        const response = await fetch(`${apiBaseUrl}/api/lectures/transcribe`, { method: "POST", headers: { "Content-Type": file.type || "audio/m4a", "x-muhadir-transcription-language": lecture.transcriptionLanguage ?? "ar" }, body: file });
        const payload = await response.json() as { text?: string; error?: string; segments?: { id: string; text: string; startSeconds: number; endSeconds: number }[] };
        if (!response.ok || !payload.text) throw new Error(payload.error || `تعذر استخراج نص الجزء ${index + 1}.`);
        completedParts = mergeTranscribedPart(completedParts, { sourceId: part.id, text: payload.text, segments: (payload.segments ?? []).map((segment) => ({ ...segment, id: `${part.id}-${segment.id}`, startSeconds: segment.startSeconds + offsetSeconds, endSeconds: segment.endSeconds + offsetSeconds })) });
        const merged = buildMergedTranscript(completedParts, sourceIds);
        updateLecture(lecture.id, { transcribedAudioParts: completedParts, transcript: merged.transcript, transcriptSegments: merged.segments, transcriptionStatus: "processing", transcriptionProgress: getTranscriptionProgress(completedParts, parts.length), retryReason: undefined });
      }
      const merged = buildMergedTranscript(completedParts, sourceIds);
      updateLecture(lecture.id, { transcribedAudioParts: completedParts, transcript: merged.transcript, transcriptEditedText: undefined, transcriptEditedAt: undefined, transcriptSegments: merged.segments, transcriptionStatus: "completed", transcriptionProgress: 100, summaryStatus: "ready" });
      if (!remainingParts.length) Alert.alert("النص جاهز", "كانت جميع أجزاء المحاضرة محوّلة مسبقاً، واكتمل توحيد النتيجة المحلية.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "أعد المحاولة لاحقاً.";
      updateLecture(lecture.id, { transcriptionStatus: "failed", transcriptionProgress: getTranscriptionProgress(completedParts, parts.length), retryReason: message });
      Alert.alert("توقف التحويل مؤقتاً", `${message}\nلن يعاد رفع الأجزاء الناجحة عند المحاولة التالية.`);
    } finally { setIsTranscribing(false); }
  };

  const createSummary = async () => {
    const transcript = getLectureTranscript(lecture);
    if (!transcript) return;
    try {
      updateLecture(lecture.id, { summaryStatus: "processing", summaryProgress: 20, retryReason: undefined });
      const summary = await summarize.mutateAsync({ transcript, language: lecture.transcriptionLanguage === "en" ? "en" : "ar", style: summaryStyle });
      const version = createSummaryVersion(summary, summaryStyle, new Date().toISOString(), `summary-${Date.now()}`);
      const versions = [...summaryVersions, version].slice(-8);
      updateLecture(lecture.id, { summary, summaryVersions: versions, activeSummaryVersionId: version.id, summaryStatus: "completed", summaryProgress: 100 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "أعد المحاولة لاحقاً.";
      updateLecture(lecture.id, { summaryStatus: "failed", summaryProgress: 0, retryReason: message });
      Alert.alert("تعذر إنشاء الملخص", message);
    }
  };

  const exportPdf = async () => {
    if (!getLectureTranscript(lecture) && !activeSummary) { Alert.alert("لا يوجد محتوى للتصدير", "حوّل المحاضرة إلى نص أو أنشئ ملخصاً أولاً."); return; }
    try { await exportLecturePdf(lecture, subject); } catch { Alert.alert("تعذر التصدير", "حاول إنشاء ملف PDF مرة أخرى."); }
  };

  const createReviewCards = () => {
    if (!activeSummary) return;
    if (reviewCards.some((card) => card.lectureId === lecture.id)) {
      Alert.alert("بطاقات المراجعة جاهزة", "أُنشئت بطاقات لهذه المحاضرة من قبل ويمكنك فتحها من تبويب المراجعة.");
      return;
    }
    addReviewCards(lecture.id, activeSummary.reviewQuestions.map((question, index) => ({ question, answer: activeSummary.keyPoints[index % activeSummary.keyPoints.length] ?? activeSummary.overview ?? "راجع نص المحاضرة." })));
    Alert.alert("تمت الإضافة", "أضيفت أسئلة الملخص إلى مراجعة اليوم.");
  };

  const chooseTranscriptionLanguage = (language: TranscriptLanguage) => updateLecture(lecture.id, { transcriptionLanguage: language });
  const beginTranscriptEditing = () => { setTranscriptDraft(getLectureTranscript(lecture)); setIsTranscriptEditing(true); };
  const saveTranscriptEditing = () => {
    const edited = normalizeEditedTranscript(transcriptDraft);
    if (!edited) { Alert.alert("النص فارغ", "أدخل نصاً صالحاً أو اختر إلغاء للعودة إلى النص الأصلي."); return; }
    updateLecture(lecture.id, { transcriptEditedText: edited, transcriptEditedAt: new Date().toISOString() });
    setIsTranscriptEditing(false); setShowOriginalSegments(false);
  };
  const restoreOriginalTranscript = () => Alert.alert("استعادة النص الأصلي", "سيُزال التعديل المحلي فقط، وتبقى المقاطع الزمنية والنص الناتج من التحويل محفوظة.", [{ text: "إلغاء", style: "cancel" }, { text: "استعادة", style: "destructive", onPress: () => { updateLecture(lecture.id, { transcriptEditedText: undefined, transcriptEditedAt: undefined }); setShowOriginalSegments(false); } }]);
  const activateSummaryVersion = (id: string) => { const version = summaryVersions.find((item) => item.id === id); if (version) updateLecture(lecture.id, { activeSummaryVersionId: id, summary: version.summary }); };
  const beginSummaryEditing = () => {
    if (!activeSummary) return;
    setSummaryDraft({ overview: activeSummary.overview, keyPoints: activeSummary.keyPoints.join("\n"), terms: activeSummary.terms.join("\n"), reviewQuestions: activeSummary.reviewQuestions.join("\n") });
    setIsSummaryEditing(true);
  };
  const saveSummaryEditing = () => {
    const summary = validateLectureSummaryDraft(summaryDraft);
    if (!summary || !activeSummaryVersion) { Alert.alert("تحقق من الملخص", "اكتب ملخصاً لا يقل عن 10 أحرف، ونقطتين أساسيتين وسؤالين للمراجعة على الأقل."); return; }
    const edited = { ...activeSummaryVersion, summary, source: "edited" as const, editedAt: new Date().toISOString() };
    updateLecture(lecture.id, { summary, summaryVersions: summaryVersions.map((item) => item.id === edited.id ? edited : item), activeSummaryVersionId: edited.id });
    setIsSummaryEditing(false);
  };
  const addLinkedNote = () => {
    const partOffset = audioParts.slice(0, activePartIndex).reduce((total, part) => total + part.durationSeconds, 0);
    const note = createLinkedLectureNote(`note-${Date.now()}`, linkedNoteDraft, activePart ? partOffset + playerStatus.currentTime : undefined, new Date().toISOString());
    if (!note) { Alert.alert("اكتب ملاحظة", "أضف فكرة أو سؤالاً قصيراً قبل الحفظ."); return; }
    updateLecture(lecture.id, { notes: [note, ...(lecture.notes ?? [])] });
    setLinkedNoteDraft("");
  };
  const addNoteReviewCard = (note: NonNullable<typeof lecture.notes>[number]) => {
    if (note.reviewCardCreatedAt) { Alert.alert("البطاقة موجودة", "أُنشئت بطاقة مراجعة لهذه الملاحظة سابقاً."); return; }
    addReviewCards(lecture.id, [createReviewCardFromLinkedNote(note)]);
    updateLecture(lecture.id, { notes: (lecture.notes ?? []).map((item) => item.id === note.id ? { ...item, reviewCardCreatedAt: new Date().toISOString() } : item) });
    Alert.alert("أُضيفت بطاقة", "أُضيفت بطاقة الملاحظة إلى مراجعة المحاضرة.");
  };

  const addTagValue = (value: string, color = tagColor) => {
    const tag = value.trim().replace(/\s+/g, " ").slice(0, 28);
    if (!tag) return;
    if ((lecture.tags ?? []).some((item) => item.toLocaleLowerCase("ar") === tag.toLocaleLowerCase("ar"))) { setTagInput(""); return; }
    updateLecture(lecture.id, { tags: [...(lecture.tags ?? []), tag], tagColors: { ...(lecture.tagColors ?? {}), [tag]: color } });
    setTagInput("");
  };

  const addTag = () => addTagValue(tagInput);

  const removeTag = (tag: string) => { const tagColors = { ...(lecture.tagColors ?? {}) }; delete tagColors[tag]; updateLecture(lecture.id, { tags: (lecture.tags ?? []).filter((item) => item !== tag), tagColors }); };

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

  const extractAttachmentText = async (attachment: LectureAttachment) => {
    const validationError = getAttachmentExtractionError(attachment.mimeType, attachment.sizeBytes);
    if (validationError) { Alert.alert("لا يمكن استخراج النص", validationError); return; }
    try {
      const file = new File(attachment.uri);
      if (!file.exists) throw new Error("لم يعد ملف الصورة متاحاً على الجهاز.");
      const size = file.size ?? attachment.sizeBytes ?? 0;
      const sizeError = getAttachmentExtractionError(attachment.mimeType, size);
      if (sizeError) throw new Error(sizeError);
      updateAttachment(lecture.id, attachment.id, { extractionStatus: "processing", extractionError: undefined });
      const result = await extractImageText.mutateAsync({ fileName: attachment.title, mimeType: attachment.mimeType, dataBase64: await file.base64() });
      updateAttachment(lecture.id, attachment.id, { extractionStatus: "completed", extractedText: result.text, extractionKeyPoints: result.keyPoints, extractionReviewCards: result.reviewCards, extractionReviewCardsAddedAt: undefined, extractedAt: new Date().toISOString(), extractionError: undefined });
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر استخراج النص من الصورة.";
      updateAttachment(lecture.id, attachment.id, { extractionStatus: "failed", extractionError: message });
      Alert.alert("تعذر استخراج النص", message);
    }
  };

  const addAttachmentReviewCards = (attachment: LectureAttachment) => {
    const cards = attachment.extractionReviewCards ?? [];
    if (!cards.length) { Alert.alert("لا توجد بطاقات", "لم تتضمن نتيجة الصورة معلومات كافية لإنشاء بطاقات مراجعة."); return; }
    if (attachment.extractionReviewCardsAddedAt) { Alert.alert("البطاقات مضافة", "أُضيفت بطاقات هذه الصورة سابقاً إلى مراجعة المحاضرة."); return; }
    addReviewCards(lecture.id, cards);
    updateAttachment(lecture.id, attachment.id, { extractionReviewCardsAddedAt: new Date().toISOString() });
    Alert.alert("تمت الإضافة", `أُضيفت ${cards.length} بطاقات من «${attachment.title}» إلى مراجعة اليوم.`);
  };

  const backupMediaEncrypted = async () => {
    if (!isAuthenticated) { Alert.alert("تسجيل الدخول مطلوب", "تظل الملفات محلية افتراضياً. سجّل الدخول فقط إن أردت إنشاء نسخة مشفرة منها.", [{ text: "إلغاء", style: "cancel" }, { text: "تسجيل الدخول", onPress: () => void startOAuthLogin() }]); return; }
    if (Platform.OS === "web") { Alert.alert("استخدم الهاتف", "النسخ المشفر للملفات المحلية يتطلب تطبيق الهاتف."); return; }
    const audioParts = lecture.audioParts?.length ? lecture.audioParts : lecture.audioUri ? [{ id: `${lecture.id}-legacy`, uri: lecture.audioUri, sizeBytes: lecture.audioSizeBytes }] : [];
    const files = [...audioParts.map((part, index) => ({ sourceId: part.id, uri: part.uri, name: `lecture-${lecture.id}-part-${index + 1}.m4a`, contentType: "audio/m4a", sizeBytes: part.sizeBytes })), ...(lecture.attachments ?? []).map((attachment) => ({ sourceId: attachment.id, uri: attachment.uri, name: attachment.title, contentType: attachment.mimeType, sizeBytes: attachment.sizeBytes }))];
    if (!files.length) { Alert.alert("لا توجد ملفات", "لا توجد ملفات صوتية أو مرفقات لنسخها احتياطياً."); return; }
    Alert.alert("نسخة مشفرة اختيارية", `سيُشفّر التطبيق ${files.length} ملفاً ثم يحفظها في نسختك الاحتياطية.`, [{ text: "إلغاء", style: "cancel" }, { text: "متابعة", onPress: () => void uploadFiles(files) }]);
  };

  const uploadFiles = async (files: BackupUploadItem[], startAt = 0) => {
    try {
      setUploadQueue(files);
      setUploadIndex(startAt);
      setUploadPaused(false);
      if (startAt === 0) setFailedUploadItem(null);
      pauseRequested.current = false;
      for (let index = startAt; index < files.length; index += 1) {
        if (pauseRequested.current) { setUploadPaused(true); return; }
        const item = files[index];
        setUploadProgress({ current: index + 1, total: files.length, fileName: item.name });
        try {
          const file = new File(item.uri);
          if (!file.exists) throw new Error(`لم يعد الملف «${item.name}» متاحاً على الجهاز.`);
          if (file.size > 16 * 1024 * 1024) throw new Error(`الملف «${item.name}» أكبر من الحد الحالي للنسخ المشفر.`);
          await encryptedUpload.mutateAsync({ lectureId: lecture.id, sourceId: item.sourceId, fileName: item.name, contentType: item.contentType, dataBase64: await file.base64() });
        } catch (error) { setFailedUploadItem(item); throw error; }
        setUploadIndex(index + 1);
      }
      setUploadQueue([]);
      setUploadIndex(0);
      addBackupActivity({ action: "media-backup", status: "completed", message: "اكتملت النسخة المشفرة لملفات المحاضرة.", fileCount: files.length });
      void notifyBackupOutcome("completed", `اكتملت النسخة المشفرة لـ ${files.length} ملف.`);
      Alert.alert("تم إنشاء النسخة المشفرة", "حُفظت الملفات المحددة بطريقة مشفرة في نسختك الاختيارية.");
    } catch (error) { addBackupActivity({ action: "media-backup", status: "failed", message: `تعذر رفع ${failedUploadItem?.name ?? "ملف"} في النسخة المشفرة.` }); void notifyBackupOutcome("failed", "تعذر رفع أحد ملفات النسخة المشفرة. يمكنك إعادة محاولة الملف من صفحة المحاضرة."); Alert.alert("تعذر النسخ المشفر", error instanceof Error ? error.message : "حاول مرة أخرى."); }
    finally { if (!pauseRequested.current) setUploadProgress(null); }
  };

  const pauseUpload = () => { if (uploadQueue.length) pauseRequested.current = true; };
  const resumeUpload = () => { if (uploadQueue.length) void uploadFiles(uploadQueue, uploadIndex); };
  const retryFailedUpload = () => { if (failedUploadItem) void uploadFiles([failedUploadItem]); };

  const statusText = lecture.transcriptionStatus === "completed" ? "تم التحويل إلى نص" : lecture.transcriptionStatus === "processing" ? "يجري التحويل" : lecture.transcriptionStatus === "failed" ? "فشل التحويل" : "محفوظ محلياً";
  const statusTone = lecture.transcriptionStatus === "completed" ? "success" : lecture.transcriptionStatus === "processing" ? "warning" : "neutral";
  const audioProgress = playerStatus.duration ? Math.min(100, (playerStatus.currentTime / playerStatus.duration) * 100) : 0;
  const activePart = audioParts[activePartIndex];

  return <ScreenContainer className="px-5"><AppHeader eyebrow={subject?.title ?? "محاضرة"} title={lecture.title} action={<IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} tone="neutral" />} /><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.audioCard}>
      <View style={styles.audioTop}><StatusPill label={lecture.section === "theory" ? "نظري" : "عملي"} tone="primary" /><Text style={styles.date}>{new Date(lecture.recordedAt).toLocaleDateString("ar", { month: "long", day: "numeric" })}</Text></View>
      <View style={styles.wave}>{[18, 30, 46, 25, 54, 34, 20].map((height, index) => <View key={index} style={[styles.waveLine, { height }]} />)}</View>
      {audioParts.length > 1 ? <View style={styles.partTabs}>{audioParts.map((part, index) => <Pressable key={part.id} onPress={() => selectPart(index)} style={[styles.partTab, activePartIndex === index && styles.partTabActive]}><Text style={[styles.partTabText, activePartIndex === index && styles.partTabTextActive]}>الجزء {index + 1}</Text></Pressable>)}</View> : null}
      <View style={styles.speedRow}><Text style={styles.speedLabel}>السرعة</Text>{[0.75, 1, 1.25, 1.5, 2].map((rate) => <Pressable key={rate} onPress={() => selectPlaybackRate(rate)} style={[styles.speedChip, playbackRate === rate && styles.speedChipActive]}><Text style={[styles.speedChipText, playbackRate === rate && styles.speedChipTextActive]}>{rate}×</Text></Pressable>)}</View>
      <View style={styles.playRow}><Text style={styles.duration}>{formatDuration(Math.floor(playerStatus.duration || activePart?.durationSeconds || lecture.durationSeconds))}</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${audioProgress}%` }]} /></View><Text style={styles.duration}>{formatDuration(Math.floor(playerStatus.currentTime || 0))}</Text></View>
      {audioParts.length > 1 ? <Text style={styles.partLabel}>الجزء {activePartIndex + 1} من {audioParts.length}</Text> : null}
      <Pressable onPress={togglePlayback} style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}><MaterialIcons name={playerStatus.playing ? "pause" : "play-arrow"} size={27} color="#FFFFFF" /><Text style={styles.playText}>{playerStatus.playing ? "إيقاف مؤقت" : "تشغيل التسجيل"}</Text></Pressable>
    </View>

    <View style={styles.attachmentsCard}><View style={styles.attachmentsHeader}><Text style={styles.sectionTitle}>إشارات المحاضرة</Text><StatusPill label={`${(lecture.bookmarks ?? []).length} إشارة`} tone="neutral" /></View><Text style={styles.attachmentPrivacy}>احفظ موضعًا مهمًا أثناء التشغيل، ثم اضغط عليه للعودة إليه لاحقًا.</Text><View style={styles.attachmentRow}><TextInput value={bookmarkLabel} onChangeText={setBookmarkLabel} onSubmitEditing={addBookmark} returnKeyType="done" placeholder="مثال: تعريف مهم أو سؤال" placeholderTextColor="#94A3B8" textAlign="right" style={styles.attachmentTitle} /><Pressable disabled={!activePart} accessibilityLabel="حفظ إشارة زمنية" onPress={addBookmark} style={[styles.attachmentDelete, !activePart && styles.disabled]}><MaterialIcons name="bookmark-add" size={18} color={appTheme.primary} /></Pressable></View>{(lecture.bookmarks ?? []).slice().sort((a, b) => a.seconds - b.seconds).map((bookmark) => <View key={bookmark.id} style={styles.attachmentTop}><Pressable accessibilityLabel={`تشغيل من ${bookmark.label}`} onPress={() => playTranscriptSegment(bookmark.seconds)} style={styles.attachmentOpen}><MaterialIcons name="bookmark" size={19} color={appTheme.primary} /><Text style={styles.attachmentTitle} numberOfLines={1}>{bookmark.label}</Text><Text style={styles.segmentTime}>{formatDuration(bookmark.seconds)}</Text></Pressable><Pressable accessibilityLabel={`حذف إشارة ${bookmark.label}`} onPress={() => removeBookmark(bookmark.id)} style={styles.attachmentDelete}><MaterialIcons name="close" size={17} color={appTheme.danger} /></Pressable></View>)}</View>

    <Pressable disabled={!lecture.transcript && !activeSummary} onPress={exportPdf} style={({ pressed }) => [styles.exportButton, (!lecture.transcript && !activeSummary) && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="picture-as-pdf" size={20} color={appTheme.primary} /><Text style={styles.exportText}>تصدير النص والملخص PDF</Text></Pressable>
    <View style={styles.linkedNotesCard}><View style={styles.attachmentsHeader}><Text style={styles.sectionTitle}>ملاحظات مترابطة</Text><StatusPill label={`${(lecture.notes ?? []).length} ملاحظة`} tone="neutral" /></View><Text style={styles.attachmentPrivacy}>تربط الملاحظة بموضع التشغيل الحالي إن وُجد، وتبقى محلية داخل المحاضرة.</Text><View style={styles.reviewSources}><SourcePill label="النص" available={reviewSources.transcript} /><SourcePill label="الملخص" available={reviewSources.summary} /><SourcePill label={`ملاحظات ${reviewSources.notes}`} available={reviewSources.notes > 0} /><SourcePill label={`صور ${reviewSources.extractedAttachments}`} available={reviewSources.extractedAttachments > 0} /></View><View style={styles.attachmentRow}><TextInput value={linkedNoteDraft} onChangeText={setLinkedNoteDraft} onSubmitEditing={addLinkedNote} returnKeyType="done" placeholder="فكرة أو سؤال من المحاضرة" placeholderTextColor="#94A3B8" textAlign="right" style={styles.attachmentTitle} /><Pressable accessibilityLabel="حفظ ملاحظة مرتبطة" onPress={addLinkedNote} style={styles.attachmentDelete}><MaterialIcons name="note-add" size={18} color={appTheme.primary} /></Pressable></View>{(lecture.notes ?? []).map((note) => <View key={note.id} style={styles.linkedNoteRow}><View style={styles.linkedNoteTop}><Text style={styles.linkedNoteText}>{note.text}</Text><Text style={styles.linkedNoteMeta}>{note.timestampSeconds === undefined ? "ملاحظة عامة" : `عند ${formatDuration(note.timestampSeconds)}`}</Text></View><View style={styles.linkedNoteActions}>{note.timestampSeconds !== undefined ? <Pressable onPress={() => playTranscriptSegment(note.timestampSeconds!)} style={styles.linkedNoteAction}><MaterialIcons name="play-arrow" size={16} color={appTheme.primary} /><Text style={styles.linkedNoteActionText}>تشغيل</Text></Pressable> : null}<Pressable disabled={Boolean(note.reviewCardCreatedAt)} onPress={() => addNoteReviewCard(note)} style={[styles.linkedNoteAction, note.reviewCardCreatedAt && styles.disabled]}><MaterialIcons name={note.reviewCardCreatedAt ? "check" : "style"} size={16} color={appTheme.primary} /><Text style={styles.linkedNoteActionText}>{note.reviewCardCreatedAt ? "أضيفت" : "بطاقة مراجعة"}</Text></Pressable></View></View>)}</View>
    <View style={styles.attachmentsCard}><View style={styles.attachmentsHeader}><Text style={styles.sectionTitle}>وسوم المحاضرة</Text><StatusPill label={`${(lecture.tags ?? []).length} وسم`} tone="neutral" /></View><Text style={styles.attachmentActionText}>قوالب سريعة</Text><View style={styles.tags}>{TAG_TEMPLATES.map((template) => <Pressable key={template.label} onPress={() => addTagValue(template.label, template.color)} style={[styles.tag, { backgroundColor: `${template.color}20` }]}><Text style={[styles.tagText, { color: template.color }]}>{template.label} +</Text></Pressable>)}</View><View style={styles.tags}>{TAG_COLORS.map((color) => <Pressable key={color} onPress={() => setTagColor(color)} style={[styles.tag, { backgroundColor: color, opacity: tagColor === color ? 1 : 0.35 }]}><Text style={[styles.tagText, { color: "#FFFFFF" }]}>{tagColor === color ? "✓" : "●"}</Text></Pressable>)}</View><View style={styles.attachmentRow}><TextInput value={tagInput} onChangeText={setTagInput} onSubmitEditing={addTag} returnKeyType="done" placeholder="مثل: امتحان، مهم، مشروع" placeholderTextColor="#94A3B8" textAlign="right" style={styles.attachmentTitle} /><Pressable accessibilityLabel="إضافة وسم" onPress={addTag} style={styles.attachmentDelete}><MaterialIcons name="add" size={18} color={tagColor} /></Pressable></View>{(lecture.tags ?? []).length ? <View style={styles.tags}>{(lecture.tags ?? []).map((tag) => { const color = lecture.tagColors?.[tag] ?? appTheme.primary; return <Pressable key={tag} onPress={() => removeTag(tag)} style={[styles.tag, { backgroundColor: `${color}20` }]}><Text style={[styles.tagText, { color }]}>{tag} ×</Text></Pressable>; })}</View> : <Text style={styles.attachmentActionText}>اختر لوناً ثم أضف وسوماً قصيرة لتسهيل العثور على المحاضرة لاحقاً.</Text>}</View>

    <View style={styles.attachmentsCard}><View style={styles.attachmentsHeader}><Text style={styles.sectionTitle}>مرفقات المحاضرة</Text><StatusPill label={`${(lecture.attachments ?? []).length} مرفق`} tone="neutral" /></View><Text style={styles.attachmentPrivacy}>يُرسل محتوى الصورة لخدمة الاستخراج عند ضغطك على الزر فقط، ثم تُحفظ النتيجة محلياً داخل المحاضرة.</Text><View style={styles.attachmentActions}><Pressable onPress={() => void addImage("camera")} style={styles.attachmentAction}><MaterialIcons name="photo-camera" size={18} color={appTheme.primary} /><Text style={styles.attachmentActionText}>التقاط سبورة</Text></Pressable><Pressable onPress={() => void addImage("library")} style={styles.attachmentAction}><MaterialIcons name="image" size={18} color={appTheme.primary} /><Text style={styles.attachmentActionText}>إضافة صورة</Text></Pressable><Pressable onPress={() => void addDocument()} style={styles.attachmentAction}><MaterialIcons name="attach-file" size={18} color={appTheme.primary} /><Text style={styles.attachmentActionText}>PDF أو ملف</Text></Pressable></View>{(lecture.attachments ?? []).map((attachment) => <View key={attachment.id} style={styles.attachmentRow}><View style={styles.attachmentTop}><Pressable onPress={() => void Linking.openURL(attachment.uri)} style={styles.attachmentOpen}><MaterialIcons name={attachment.kind === "image" ? "image" : "description"} size={19} color={appTheme.primary} /><Text style={styles.attachmentTitle} numberOfLines={1}>{attachment.title}</Text></Pressable><Pressable accessibilityLabel="إزالة المرفق" onPress={() => deleteAttachment(attachment.id, attachment.title)} style={styles.attachmentDelete}><MaterialIcons name="close" size={17} color={appTheme.danger} /></Pressable></View>{isImageExtractionSupported(attachment.mimeType) ? <Pressable disabled={extractImageText.isPending || attachment.extractionStatus === "processing"} onPress={() => void extractAttachmentText(attachment)} style={[styles.extractButton, (extractImageText.isPending || attachment.extractionStatus === "processing") && styles.disabled]}><MaterialIcons name={attachment.extractionStatus === "completed" ? "refresh" : "document-scanner"} size={17} color={appTheme.primary} /><Text style={styles.extractButtonText}>{attachment.extractionStatus === "processing" ? "يجري استخراج النص" : attachment.extractionStatus === "completed" ? "إعادة استخراج النص" : attachment.extractionStatus === "failed" ? "إعادة المحاولة" : "استخراج النص من الصورة"}</Text></Pressable> : null}{attachment.extractionStatus === "failed" ? <Text style={styles.extractionError}>{attachment.extractionError}</Text> : null}{attachment.extractionReviewCards?.length ? <Pressable disabled={Boolean(attachment.extractionReviewCardsAddedAt)} onPress={() => addAttachmentReviewCards(attachment)} style={[styles.extractButton, attachment.extractionReviewCardsAddedAt && styles.disabled]}><MaterialIcons name={attachment.extractionReviewCardsAddedAt ? "check-circle" : "style"} size={17} color={appTheme.primary} /><Text style={styles.extractButtonText}>{attachment.extractionReviewCardsAddedAt ? "أُضيفت بطاقات الصورة" : `إضافة ${attachment.extractionReviewCards.length} بطاقات إلى المراجعة`}</Text></Pressable> : null}{attachment.extractedText ? <View style={styles.extractionResult}><Text style={styles.extractionLabel}>النص المستخرج</Text><Text style={styles.extractionText} numberOfLines={7}>{attachment.extractedText}</Text>{attachment.extractionKeyPoints?.length ? <View style={styles.tags}>{attachment.extractionKeyPoints.map((point) => <View key={point} style={styles.tag}><Text style={styles.tagText}>{point}</Text></View>)}</View> : null}</View> : null}</View>)}</View>
    <Pressable disabled={encryptedUpload.isPending || uploadPaused} onPress={() => void backupMediaEncrypted()} style={({ pressed }) => [styles.encryptedBackup, (encryptedUpload.isPending || uploadPaused) && styles.disabled, pressed && styles.pressed]}><MaterialIcons name="lock" size={19} color={appTheme.success} /><Text style={styles.encryptedBackupText}>{uploadProgress ? `رفع ${uploadProgress.current}/${uploadProgress.total}: ${uploadProgress.fileName}` : encryptedUpload.isPending ? "يجري التشفير والحفظ" : "إنشاء نسخة مشفرة للملفات"}</Text></Pressable>
    {uploadProgress ? <Pressable onPress={uploadPaused ? resumeUpload : pauseUpload} style={styles.uploadControl}><MaterialIcons name={uploadPaused ? "play-arrow" : "pause"} size={18} color={appTheme.primary} /><Text style={styles.uploadControlText}>{uploadPaused ? `استئناف من الملف ${uploadIndex + 1}` : "إيقاف بعد الملف الحالي"}</Text></Pressable> : null}
    {failedUploadItem ? <Pressable onPress={retryFailedUpload} style={styles.retryUpload}><MaterialIcons name="refresh" size={18} color={appTheme.warning} /><Text style={styles.retryUploadText}>إعادة محاولة رفع «{failedUploadItem.name}»</Text></Pressable> : null}

    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>النص</Text><StatusPill label={statusText} tone={statusTone} /></View>
    <View style={styles.languageCard}><Text style={styles.languageHint}>لغة التحويل</Text><View style={styles.languageChoices}>{TRANSCRIPT_LANGUAGE_OPTIONS.map((option) => <Pressable key={option.value} disabled={isTranscribing || lecture.transcriptionStatus === "processing"} onPress={() => chooseTranscriptionLanguage(option.value)} style={[styles.languageChip, (lecture.transcriptionLanguage ?? "ar") === option.value && styles.languageChipActive]}><Text style={[styles.languageChipText, (lecture.transcriptionLanguage ?? "ar") === option.value && styles.languageChipTextActive]}>{option.label}</Text></Pressable>)}</View><Text style={styles.languageHint}>تُستخدم «{getTranscriptLanguageLabel(lecture.transcriptionLanguage)}» عند التحويل أو إعادة المحاولة التالية.</Text></View>
    {lecture.transcript ? <><View style={styles.transcriptActions}>{isTranscriptEditing ? <><Pressable onPress={() => setIsTranscriptEditing(false)} style={styles.transcriptAction}><Text style={styles.transcriptActionText}>إلغاء</Text></Pressable><Pressable onPress={saveTranscriptEditing} style={[styles.transcriptAction, styles.transcriptActionPrimary]}><Text style={[styles.transcriptActionText, styles.transcriptActionPrimaryText]}>حفظ التعديل</Text></Pressable></> : <><Pressable onPress={beginTranscriptEditing} style={[styles.transcriptAction, styles.transcriptActionPrimary]}><MaterialIcons name="edit" size={16} color="#FFFFFF" /><Text style={[styles.transcriptActionText, styles.transcriptActionPrimaryText]}>تحرير النص محلياً</Text></Pressable>{lecture.transcriptEditedAt ? <><Pressable onPress={() => setShowOriginalSegments((current) => !current)} style={styles.transcriptAction}><Text style={styles.transcriptActionText}>{showOriginalSegments ? "عرض النص المحرر" : "عرض المقاطع الأصلية"}</Text></Pressable><Pressable onPress={restoreOriginalTranscript} style={styles.transcriptAction}><Text style={styles.transcriptActionText}>استعادة النص الأصلي</Text></Pressable></> : null}</>}</View><View style={styles.transcriptCard}>{isTranscriptEditing ? <TextInput value={transcriptDraft} onChangeText={setTranscriptDraft} multiline textAlign="right" textAlignVertical="top" style={styles.transcriptEditor} placeholder="راجع نص المحاضرة هنا" placeholderTextColor="#94A3B8" /> : showOriginalSegments || !lecture.transcriptEditedAt ? lecture.transcriptSegments?.length ? lecture.transcriptSegments.map((segment) => <Pressable key={segment.id} onPress={() => playTranscriptSegment(segment.startSeconds)} style={({ pressed }) => [styles.segmentLine, pressed && styles.pressed]}><MaterialIcons name="play-circle-outline" size={18} color={appTheme.primary} /><Text style={styles.segmentText}>{segment.text}</Text><Text style={styles.segmentTime}>{formatDuration(Math.floor(segment.startSeconds))}</Text></Pressable>) : <Text style={styles.transcript}>{lecture.transcript}</Text> : <Text style={styles.transcript}>{getLectureTranscript(lecture)}</Text>}</View>{lecture.transcriptEditedAt && !isTranscriptEditing ? <Text style={styles.editedNotice}>النص المعروض محرر محلياً؛ تبقى المقاطع الزمنية الأصلية متاحة دون تغيير.</Text> : null}{lecture.transcriptionStatus !== "completed" ? <Pressable onPress={transcribe} style={styles.resumeTranscription}><MaterialIcons name="refresh" size={18} color={appTheme.primary} /><Text style={styles.resumeTranscriptionText}>استئناف تحويل الأجزاء المتبقية</Text></Pressable> : null}</> : <ActionCard icon="text-snippet" color={appTheme.primary} title={lecture.transcriptionStatus === "failed" ? "تعذر التحويل سابقاً" : "حوّل التسجيل إلى نص"} description={lecture.transcriptionStatus === "failed" ? lecture.retryReason ?? "تحقق من الشبكة ثم أعد المحاولة." : "يُرفع التسجيل عند اختيارك لهذه الخطوة فقط ثم يحفظ النص مع المحاضرة."}>{isTranscribing || lecture.transcriptionStatus === "processing" ? <ProgressNotice progress={lecture.transcriptionProgress ?? 15} label="يجري رفع التسجيل وتحويله" /> : <PrimaryButton label={lecture.transcriptionStatus === "failed" ? "إعادة المحاولة" : "تحويل إلى نص"} icon="text-snippet" onPress={transcribe} />}</ActionCard>}

    {lecture.transcript ? <><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>الملخص الذكي</Text>{activeSummary ? <StatusPill label={getSummaryStyleLabel(activeSummaryVersion?.style)} tone="success" /> : null}</View><View style={styles.summaryControls}><Text style={styles.summaryHint}>اختر الصيغة ثم أنشئ نسخة جديدة؛ تبقى آخر 8 نسخ محفوظة محلياً.</Text><View style={styles.summaryStyleChoices}>{SUMMARY_STYLES.map((option) => <Pressable key={option.value} disabled={summarize.isPending} onPress={() => setSummaryStyle(option.value)} style={[styles.summaryStyleChip, summaryStyle === option.value && styles.summaryStyleChipActive]}><Text style={[styles.summaryStyleText, summaryStyle === option.value && styles.summaryStyleTextActive]}>{option.label}</Text></Pressable>)}</View>{summaryVersions.length > 1 ? <View style={styles.summaryVersionChoices}>{summaryVersions.map((version, index) => <Pressable key={version.id} onPress={() => activateSummaryVersion(version.id)} style={[styles.summaryVersionChip, activeSummaryVersion?.id === version.id && styles.summaryVersionChipActive]}><Text style={[styles.summaryVersionText, activeSummaryVersion?.id === version.id && styles.summaryVersionTextActive]}>نسخة {index + 1} · {getSummaryStyleLabel(version.style)}</Text></Pressable>)}</View> : null}</View>{activeSummary ? <>{isSummaryEditing ? <SummaryEditor draft={summaryDraft} onChange={setSummaryDraft} onCancel={() => setIsSummaryEditing(false)} onSave={saveSummaryEditing} /> : <><SummaryView summary={activeSummary} /><View style={styles.summaryActionRow}><Pressable onPress={beginSummaryEditing} style={styles.summaryMinorAction}><MaterialIcons name="edit" size={17} color={appTheme.primary} /><Text style={styles.summaryMinorActionText}>تحرير هذه النسخة</Text></Pressable><Pressable disabled={summarize.isPending} onPress={createSummary} style={styles.summaryMinorAction}><MaterialIcons name="auto-awesome" size={17} color={appTheme.primary} /><Text style={styles.summaryMinorActionText}>إنشاء نسخة جديدة</Text></Pressable></View><View style={styles.reviewAction}><PrimaryButton label="إضافة أسئلة إلى المراجعة" icon="style" onPress={createReviewCards} /></View></>}</> : <ActionCard icon="psychology" color={appTheme.violet} title={lecture.summaryStatus === "failed" ? "تعذر التلخيص سابقاً" : "رتّب أهم ما في المحاضرة"} description={lecture.summaryStatus === "failed" ? lecture.retryReason ?? "أعد المحاولة بعد التأكد من الاتصال." : "ينشئ ملخصاً ونقاطاً ومصطلحات وأسئلة مراجعة من النص."}>{summarize.isPending || lecture.summaryStatus === "processing" ? <ProgressNotice progress={lecture.summaryProgress ?? 20} label="يجري إنشاء الملخص الذكي" /> : <PrimaryButton label={lecture.summaryStatus === "failed" ? "إعادة المحاولة" : `إنشاء ملخص ${getSummaryStyleLabel(summaryStyle)}`} icon="auto-awesome" onPress={createSummary} />}</ActionCard>}</> : null}
  </ScrollView></ScreenContainer>;
}

function ActionCard({ icon, color, title, description, children }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; color: string; title: string; description: string; children: React.ReactNode }) { return <View style={styles.actionCard}><MaterialIcons name={icon} size={25} color={color} /><View style={styles.actionCopy}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionBody}>{description}</Text></View>{children}</View>; }
function ProgressNotice({ progress, label }: { progress: number; label: string }) { return <View style={styles.progressNotice}><View style={styles.progressTrackLight}><View style={[styles.progressFillLight, { width: `${Math.max(8, Math.min(100, progress))}%` }]} /></View><Text style={styles.progressNoticeText}>{label} · {Math.round(progress)}%</Text></View>; }
function SourcePill({ label, available }: { label: string; available: boolean }) { return <View style={[styles.sourcePill, available ? styles.sourcePillActive : styles.sourcePillMuted]}><Text style={[styles.sourcePillText, available ? styles.sourcePillTextActive : styles.sourcePillTextMuted]}>{available ? "✓ " : "— "}{label}</Text></View>; }
function SummaryView({ summary }: { summary: NonNullable<ReturnType<typeof useStudy>["lectures"][number]["summary"]> }) { return <View style={styles.summaryCard}><Text style={styles.summaryOverview}>{summary.overview}</Text><SummaryGroup title="أهم النقاط" icon="format-list-bulleted" items={summary.keyPoints} /><SummaryGroup title="مصطلحات مهمة" icon="label-outline" items={summary.terms} compact /><SummaryGroup title="أسئلة للمراجعة" icon="help-outline" items={summary.reviewQuestions} /></View>; }
function SummaryEditor({ draft, onChange, onCancel, onSave }: { draft: { overview: string; keyPoints: string; terms: string; reviewQuestions: string }; onChange: (value: { overview: string; keyPoints: string; terms: string; reviewQuestions: string }) => void; onCancel: () => void; onSave: () => void }) { const field = (key: keyof typeof draft, label: string, multiline = true) => <View style={styles.summaryEditorField}><Text style={styles.summaryEditorLabel}>{label}</Text><TextInput value={draft[key]} onChangeText={(value) => onChange({ ...draft, [key]: value })} multiline={multiline} textAlign="right" textAlignVertical="top" placeholderTextColor="#94A3B8" style={[styles.summaryEditorInput, key === "overview" && styles.summaryOverviewInput]} /></View>; return <View style={styles.summaryEditor}>{field("overview", "الفكرة العامة", true)}{field("keyPoints", "النقاط الأساسية — كل نقطة في سطر", true)}{field("terms", "المصطلحات — كل مصطلح في سطر", true)}{field("reviewQuestions", "أسئلة المراجعة — كل سؤال في سطر", true)}<View style={styles.summaryActionRow}><Pressable onPress={onCancel} style={styles.summaryMinorAction}><Text style={styles.summaryMinorActionText}>إلغاء</Text></Pressable><Pressable onPress={onSave} style={[styles.summaryMinorAction, styles.summaryMinorActionPrimary]}><Text style={[styles.summaryMinorActionText, styles.summaryMinorActionPrimaryText]}>حفظ التعديل</Text></Pressable></View></View>; }
function SummaryGroup({ title, icon, items, compact = false }: { title: string; icon: React.ComponentProps<typeof MaterialIcons>["name"]; items: string[]; compact?: boolean }) { return <View style={styles.summaryGroup}><View style={styles.summaryHeading}><MaterialIcons name={icon} size={17} color={appTheme.primary} /><Text style={styles.summaryTitle}>{title}</Text></View>{compact ? <View style={styles.tags}>{items.map((item) => <View key={item} style={styles.tag}><Text style={styles.tagText}>{item}</Text></View>)}</View> : items.map((item, index) => <View key={`${item}-${index}`} style={styles.summaryItem}><View style={styles.bullet} /><Text style={styles.summaryItemText}>{item}</Text></View>)}</View>; }
function formatDuration(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`; }

const transcriptStyleEntries = {
  languageCard: { backgroundColor: appTheme.primarySoft, borderRadius: 14, gap: 8, padding: 12 }, languageHint: { color: appTheme.muted, fontSize: 11, lineHeight: 16, textAlign: "right" as const }, languageChoices: { flexDirection: "row-reverse" as const, gap: 6 }, languageChip: { alignItems: "center" as const, backgroundColor: "#FFFFFF", borderColor: "#C7D2FE", borderRadius: 9, borderWidth: 1, flex: 1, minHeight: 34, justifyContent: "center" as const, paddingHorizontal: 5 }, languageChipActive: { backgroundColor: appTheme.primary, borderColor: appTheme.primary }, languageChipText: { color: appTheme.primary, fontSize: 10, fontWeight: "800" as const, textAlign: "center" as const }, languageChipTextActive: { color: "#FFFFFF" }, transcriptActions: { flexDirection: "row-reverse" as const, flexWrap: "wrap" as const, gap: 7 }, transcriptAction: { alignItems: "center" as const, backgroundColor: appTheme.primarySoft, borderColor: "#C7D2FE", borderRadius: 10, borderWidth: 1, flexDirection: "row-reverse" as const, gap: 5, justifyContent: "center" as const, minHeight: 36, paddingHorizontal: 10 }, transcriptActionPrimary: { backgroundColor: appTheme.primary, borderColor: appTheme.primary }, transcriptActionText: { color: appTheme.primary, fontSize: 11, fontWeight: "800" as const }, transcriptActionPrimaryText: { color: "#FFFFFF" }, transcriptEditor: { color: appTheme.ink, fontSize: 15, lineHeight: 26, minHeight: 230, padding: 0, textAlign: "right" as const }, editedNotice: { color: appTheme.muted, fontSize: 11, lineHeight: 17, textAlign: "right" as const },
};

const summaryStyleEntries = {
  summaryControls: { backgroundColor: appTheme.primarySoft, borderRadius: 14, gap: 9, padding: 12 }, summaryHint: { color: appTheme.muted, fontSize: 11, lineHeight: 17, textAlign: "right" as const }, summaryStyleChoices: { flexDirection: "row-reverse" as const, gap: 6 }, summaryStyleChip: { alignItems: "center" as const, backgroundColor: "#FFFFFF", borderColor: "#C7D2FE", borderRadius: 9, borderWidth: 1, flex: 1, justifyContent: "center" as const, minHeight: 35, paddingHorizontal: 4 }, summaryStyleChipActive: { backgroundColor: appTheme.primary, borderColor: appTheme.primary }, summaryStyleText: { color: appTheme.primary, fontSize: 10, fontWeight: "800" as const, textAlign: "center" as const }, summaryStyleTextActive: { color: "#FFFFFF" }, summaryVersionChoices: { flexDirection: "row-reverse" as const, flexWrap: "wrap" as const, gap: 6 }, summaryVersionChip: { backgroundColor: "#FFFFFF", borderColor: "#C7D2FE", borderRadius: 9, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6 }, summaryVersionChipActive: { backgroundColor: "#DBEAFE", borderColor: appTheme.primary }, summaryVersionText: { color: appTheme.muted, fontSize: 10, fontWeight: "700" as const }, summaryVersionTextActive: { color: appTheme.primary }, summaryActionRow: { flexDirection: "row-reverse" as const, gap: 8 }, summaryMinorAction: { alignItems: "center" as const, backgroundColor: appTheme.primarySoft, borderColor: "#C7D2FE", borderRadius: 11, borderWidth: 1, flex: 1, flexDirection: "row-reverse" as const, gap: 5, justifyContent: "center" as const, minHeight: 39, paddingHorizontal: 8 }, summaryMinorActionPrimary: { backgroundColor: appTheme.primary, borderColor: appTheme.primary }, summaryMinorActionText: { color: appTheme.primary, fontSize: 11, fontWeight: "800" as const }, summaryMinorActionPrimaryText: { color: "#FFFFFF" }, summaryEditor: { backgroundColor: "#F8FAFF", borderColor: "#C7D2FE", borderRadius: 18, borderWidth: 1, gap: 12, padding: 14 }, summaryEditorField: { gap: 6 }, summaryEditorLabel: { color: appTheme.primary, fontSize: 12, fontWeight: "800" as const, textAlign: "right" as const }, summaryEditorInput: { backgroundColor: "#FFFFFF", borderColor: appTheme.border, borderRadius: 10, borderWidth: 1, color: appTheme.ink, fontSize: 13, lineHeight: 20, minHeight: 74, padding: 10, textAlign: "right" as const }, summaryOverviewInput: { minHeight: 90 },
};

const linkedNotesStyleEntries = {
  linkedNotesCard: { backgroundColor: "#F8FAFF", borderColor: "#C7D2FE", borderRadius: 19, borderWidth: 1, gap: 11, padding: 14 }, reviewSources: { flexDirection: "row-reverse" as const, flexWrap: "wrap" as const, gap: 6 }, sourcePill: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5 }, sourcePillActive: { backgroundColor: "#DCFCE7" }, sourcePillMuted: { backgroundColor: "#F1F5F9" }, sourcePillText: { fontSize: 10, fontWeight: "800" as const }, sourcePillTextActive: { color: "#15803D" }, sourcePillTextMuted: { color: "#94A3B8" }, linkedNoteRow: { backgroundColor: "#FFFFFF", borderColor: appTheme.border, borderRadius: 12, borderWidth: 1, gap: 8, padding: 10 }, linkedNoteTop: { gap: 4 }, linkedNoteText: { color: appTheme.ink, fontSize: 13, lineHeight: 20, textAlign: "right" as const }, linkedNoteMeta: { color: appTheme.muted, fontSize: 10, textAlign: "right" as const }, linkedNoteActions: { flexDirection: "row-reverse" as const, gap: 7 }, linkedNoteAction: { alignItems: "center" as const, backgroundColor: appTheme.primarySoft, borderRadius: 8, flexDirection: "row-reverse" as const, gap: 4, minHeight: 30, paddingHorizontal: 8 }, linkedNoteActionText: { color: appTheme.primary, fontSize: 10, fontWeight: "800" as const },
};

const styles: Record<string, any> = StyleSheet.create({
  ...transcriptStyleEntries,
  ...summaryStyleEntries,
  ...linkedNotesStyleEntries,
  content: { gap: 17, paddingBottom: 32 }, audioCard: { backgroundColor: appTheme.ink, borderRadius: 25, padding: 19 }, audioTop: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" }, date: { color: "#CBD5E1", fontSize: 12 }, wave: { alignItems: "center", flexDirection: "row-reverse", gap: 7, height: 68, justifyContent: "center", marginTop: 10 }, waveLine: { backgroundColor: "#A5B4FC", borderRadius: 10, opacity: 0.9, width: 7 }, playRow: { alignItems: "center", flexDirection: "row-reverse", gap: 9, marginBottom: 15 }, duration: { color: "#CBD5E1", fontSize: 11, fontVariant: ["tabular-nums"] }, progressTrack: { backgroundColor: "#334155", borderRadius: 5, flex: 1, height: 5, overflow: "hidden" }, progressFill: { backgroundColor: "#A5B4FC", borderRadius: 5, height: 5 }, playButton: { alignItems: "center", backgroundColor: appTheme.primary, borderRadius: 14, flexDirection: "row-reverse", gap: 8, justifyContent: "center", minHeight: 47 }, playText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  partTabs: { flexDirection: "row-reverse", gap: 6, marginBottom: 12, overflow: "hidden" }, partTab: { backgroundColor: "#334155", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 }, partTabActive: { backgroundColor: "#E0E7FF" }, partTabText: { color: "#CBD5E1", fontSize: 11, fontWeight: "800" }, partTabTextActive: { color: appTheme.primary }, speedRow: { alignItems: "center", flexDirection: "row-reverse", gap: 6, justifyContent: "center", marginBottom: 12 }, speedLabel: { color: "#CBD5E1", fontSize: 11, fontWeight: "800", marginLeft: 4 }, speedChip: { backgroundColor: "#334155", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 }, speedChipActive: { backgroundColor: "#E0E7FF" }, speedChipText: { color: "#CBD5E1", fontSize: 11, fontWeight: "800" }, speedChipTextActive: { color: appTheme.primary }, partLabel: { color: "#CBD5E1", fontSize: 11, marginBottom: 8, textAlign: "center" },
  attachmentsCard: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 19, borderWidth: 1, gap: 11, padding: 14 }, attachmentsHeader: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between" }, attachmentPrivacy: { color: appTheme.muted, fontSize: 11, lineHeight: 17, textAlign: "right" }, attachmentActions: { flexDirection: "row-reverse", gap: 7 }, attachmentAction: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 11, flex: 1, gap: 4, justifyContent: "center", minHeight: 57, paddingHorizontal: 3 }, attachmentActionText: { color: appTheme.primary, fontSize: 10, fontWeight: "800", textAlign: "center" }, attachmentRow: { backgroundColor: "#F8FAFC", borderRadius: 12, gap: 9, padding: 10 }, attachmentTop: { alignItems: "center", flexDirection: "row-reverse", gap: 7 }, attachmentOpen: { alignItems: "center", flex: 1, flexDirection: "row-reverse", gap: 7 }, attachmentTitle: { color: appTheme.ink, flex: 1, fontSize: 12, fontWeight: "700", textAlign: "right" }, attachmentDelete: { alignItems: "center", backgroundColor: appTheme.dangerSoft, borderRadius: 9, height: 29, justifyContent: "center", width: 29 }, extractButton: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 10, flexDirection: "row-reverse", gap: 6, justifyContent: "center", minHeight: 38 }, extractButtonText: { color: appTheme.primary, fontSize: 11, fontWeight: "800" }, extractionError: { color: appTheme.danger, fontSize: 11, lineHeight: 16, textAlign: "right" }, extractionResult: { backgroundColor: "#FFFFFF", borderColor: "#C7D2FE", borderRadius: 10, borderWidth: 1, gap: 7, padding: 10 }, extractionLabel: { color: appTheme.primary, fontSize: 11, fontWeight: "800", textAlign: "right" }, extractionText: { color: appTheme.ink, fontSize: 12, lineHeight: 19, textAlign: "right" },
  exportButton: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderColor: "#C7D2FE", borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", gap: 8, justifyContent: "center", minHeight: 48 }, exportText: { color: appTheme.primary, fontSize: 14, fontWeight: "800" }, disabled: { opacity: 0.45 }, sectionHeader: { alignItems: "center", flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 3 }, sectionTitle: { color: appTheme.ink, fontSize: 19, fontWeight: "800" }, transcriptCard: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, padding: 16 }, resumeTranscription: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderColor: "#C7D2FE", borderRadius: 13, borderWidth: 1, flexDirection: "row-reverse", gap: 7, justifyContent: "center", minHeight: 44 }, resumeTranscriptionText: { color: appTheme.primary, fontSize: 13, fontWeight: "800" }, transcript: { color: appTheme.ink, fontSize: 15, lineHeight: 27, textAlign: "right" }, segmentLine: { alignItems: "flex-start", borderBottomColor: appTheme.border, borderBottomWidth: 1, flexDirection: "row-reverse", gap: 8, paddingVertical: 10 }, segmentText: { color: appTheme.ink, flex: 1, fontSize: 14, lineHeight: 22, textAlign: "right" }, segmentTime: { color: appTheme.primary, fontSize: 11, fontVariant: ["tabular-nums"], marginTop: 3 }, actionCard: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 19, borderWidth: 1, gap: 12, padding: 17 }, actionCopy: { alignItems: "flex-end", width: "100%" }, actionTitle: { color: appTheme.ink, fontSize: 16, fontWeight: "800", textAlign: "right" }, actionBody: { color: appTheme.muted, fontSize: 12, lineHeight: 19, textAlign: "right" }, progressNotice: { alignSelf: "stretch", gap: 8 }, progressTrackLight: { backgroundColor: "#E2E8F0", borderRadius: 5, height: 7, overflow: "hidden" }, progressFillLight: { backgroundColor: appTheme.primary, borderRadius: 5, height: 7 }, progressNoticeText: { color: appTheme.primary, fontSize: 12, fontWeight: "700", textAlign: "center" }, reviewAction: { marginTop: -8 },
  encryptedBackup: { alignItems: "center", backgroundColor: appTheme.successSoft, borderColor: "#99F6E4", borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", gap: 8, justifyContent: "center", minHeight: 48 }, encryptedBackupText: { color: appTheme.success, fontSize: 14, fontWeight: "800", textAlign: "center" }, uploadControl: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 13, flexDirection: "row-reverse", gap: 7, justifyContent: "center", minHeight: 42 }, uploadControlText: { color: appTheme.primary, fontSize: 12, fontWeight: "800" }, retryUpload: { alignItems: "center", backgroundColor: appTheme.warningSoft, borderColor: "#FDE68A", borderRadius: 13, borderWidth: 1, flexDirection: "row-reverse", gap: 7, justifyContent: "center", minHeight: 42 }, retryUploadText: { color: appTheme.warning, fontSize: 12, fontWeight: "800" },
  summaryCard: { backgroundColor: "#F8FAFF", borderColor: "#C7D2FE", borderRadius: 19, borderWidth: 1, gap: 19, padding: 17 }, summaryOverview: { color: appTheme.ink, fontSize: 15, fontWeight: "600", lineHeight: 25, textAlign: "right" }, summaryGroup: { gap: 9 }, summaryHeading: { alignItems: "center", flexDirection: "row-reverse", gap: 7 }, summaryTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800" }, summaryItem: { alignItems: "flex-start", flexDirection: "row-reverse", gap: 8 }, bullet: { backgroundColor: appTheme.primary, borderRadius: 4, height: 6, marginTop: 8, width: 6 }, summaryItemText: { color: "#334155", flex: 1, fontSize: 13, lineHeight: 20, textAlign: "right" }, tags: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }, tag: { backgroundColor: "#E0E7FF", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 }, tagText: { color: appTheme.primary, fontSize: 12, fontWeight: "700" }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
});
