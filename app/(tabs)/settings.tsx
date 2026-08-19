import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppHeader, PrimaryButton, StatusPill } from "@/components/study-ui";
import { startOAuthLogin } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";
import { appTheme } from "@/lib/app-theme";
import { createBackupPayload, parseBackupPayload } from "@/lib/backup-payload";
import { formatBytes } from "@/lib/lecture-export-template";
import { attachmentKindFromMime, persistBase64Attachment } from "@/lib/local-attachments";
import { useStudy } from "@/lib/study-context";
import { trpc } from "@/lib/trpc";
import { ScreenContainer } from "@/components/screen-container";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { years, terms, subjects, lectures, reviewCards, tasks, syncSettings, updateSyncSettings, replaceStoreFromBackup, updateLecture, addAttachment } = useStudy();
  const [partMinutes, setPartMinutes] = useState(String(syncSettings.recordingPartMinutes ?? 20));
  const saveBackup = trpc.studySync.save.useMutation();
  const loadBackup = trpc.studySync.load.useQuery(undefined, { enabled: false });
  const encryptedMedia = trpc.encryptedMedia.list.useQuery(undefined, { enabled: isAuthenticated });
  const restoreEncryptedMedia = trpc.encryptedMedia.restore.useMutation();
  const knownSize = lectures.reduce((sum, lecture) => sum + (lecture.audioSizeBytes ?? 0) + (lecture.attachments ?? []).reduce((attachmentSum, attachment) => attachmentSum + (attachment.sizeBytes ?? 0), 0), 0);

  const createBackup = () => {
    if (!isAuthenticated) {
      Alert.alert("تسجيل الدخول مطلوب", "النسخ الاحتياطي اختياري. سجّل الدخول أولاً لربط النسخة بحسابك.", [{ text: "إلغاء", style: "cancel" }, { text: "تسجيل الدخول", onPress: () => void startOAuthLogin() }]);
      return;
    }
    Alert.alert("تأكيد النسخ الاحتياطي", "سيُرفع تنظيم الدراسة والنصوص والملخصات فقط. تبقى ملفات الصوت والمرفقات محلية ما لم تطلب نسخها المشفر.", [{ text: "إلغاء", style: "cancel" }, { text: "إنشاء نسخة", onPress: () => void runBackup() }]);
  };

  const runBackup = async () => {
    try {
      const payload = createBackupPayload({ years, terms, subjects, lectures, reviewCards, tasks, syncSettings });
      const result = await saveBackup.mutateAsync({ payload });
      updateSyncSettings({ cloudBackupEnabled: true, lastBackupAt: result.savedAt, lastBackupStatus: "completed" });
      Alert.alert("تم النسخ الاحتياطي", "حُفظت بيانات الدراسة والنصوص والملخصات في نسختك الاختيارية.");
    } catch { updateSyncSettings({ lastBackupStatus: "failed" }); Alert.alert("تعذر النسخ الاحتياطي", "تحقق من تسجيل الدخول والاتصال ثم أعد المحاولة."); }
  };

  const restoreBackup = async () => {
    if (!isAuthenticated) { Alert.alert("تسجيل الدخول مطلوب", "سجّل الدخول لاستعادة النسخة الاحتياطية المرتبطة بحسابك."); return; }
    try {
      const response = await loadBackup.refetch();
      if (!response.data) { Alert.alert("لا توجد نسخة", "لم نعثر على نسخة احتياطية لهذا الحساب بعد."); return; }
      Alert.alert("استعادة بيانات الدراسة", "سيستبدل ذلك الهيكل الدراسي المحلي الحالي، ولا يشمل الملفات المشفرة إلا عبر زر الاستعادة المنفصل.", [{ text: "إلغاء", style: "cancel" }, { text: "استعادة", style: "destructive", onPress: () => { try { replaceStoreFromBackup(parseBackupPayload(response.data!.payload)); Alert.alert("تمت الاستعادة", "أعيدت بيانات الدراسة والنصوص والملخصات إلى هذا الجهاز."); } catch { Alert.alert("تعذرت الاستعادة", "ملف النسخة غير صالح."); } } }]);
    } catch { Alert.alert("تعذرت الاستعادة", "تحقق من الاتصال ثم أعد المحاولة."); }
  };

  const restoreMediaFiles = () => {
    if (!isAuthenticated) { Alert.alert("تسجيل الدخول مطلوب", "سجّل الدخول لاستعراض واستعادة ملفاتك المشفرة."); return; }
    const files = encryptedMedia.data ?? [];
    if (!files.length) { Alert.alert("لا توجد ملفات مشفرة", "لم نعثر على ملفات صوتية أو مرفقات مشفرة في هذا الحساب."); return; }
    Alert.alert("استعادة الملفات المشفرة", `سيجري تنزيل ${files.length} ملفاً وفك تشفيره وربطه بالمحاضرات المحلية المطابقة.`, [{ text: "إلغاء", style: "cancel" }, { text: "استعادة الملفات", onPress: () => void runMediaRestore(files.map((file) => file.id)) }]);
  };

  const runMediaRestore = async (ids: number[]) => {
    try {
      for (const id of ids) {
        const file = await restoreEncryptedMedia.mutateAsync({ id });
        const saved = await persistBase64Attachment(file.dataBase64, file.fileName);
        if (file.contentType.startsWith("audio/")) {
          const lecture = lectures.find((item) => item.id === file.lectureId);
          if (!lecture) continue;
          const parts = lecture.audioParts ?? [];
          updateLecture(lecture.id, {
            audioUri: lecture.audioUri ?? saved.uri,
            audioSizeBytes: (lecture.audioSizeBytes ?? 0) + saved.sizeBytes,
            audioParts: [...parts, { id: file.sourceId ?? `restored-${id}`, index: parts.length + 1, uri: saved.uri, durationSeconds: 0, sizeBytes: saved.sizeBytes, createdAt: new Date().toISOString() }],
          });
        } else {
          addAttachment(file.lectureId, { kind: attachmentKindFromMime(file.contentType), title: file.fileName, uri: saved.uri, mimeType: file.contentType, sizeBytes: saved.sizeBytes });
        }
      }
      Alert.alert("تمت الاستعادة", "أعيدت الملفات المشفرة إلى مساحة التطبيق وربطت بالمحاضرات المتاحة.");
      await encryptedMedia.refetch();
    } catch { Alert.alert("تعذرت استعادة الملفات", "تحقق من الاتصال ثم أعد المحاولة."); }
  };

  const saveRecordingLimit = () => {
    const value = Number(partMinutes);
    if (!Number.isInteger(value) || value < 5 || value > 60) { Alert.alert("قيمة غير صالحة", "اختر عدداً صحيحاً بين 5 و60 دقيقة لكل جزء."); return; }
    updateSyncSettings({ recordingPartMinutes: value });
    Alert.alert("تم حفظ الحد", `سيبدأ جزء صوتي جديد تلقائياً كل ${value} دقيقة.`);
  };

  return (
    <ScreenContainer className="px-5">
      <AppHeader eyebrow="التحكم والخصوصية" title="الإعدادات" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.notice}><MaterialIcons name="verified-user" size={23} color={appTheme.success} /><View style={styles.noticeText}><Text style={styles.noticeTitle}>ملفاتك تحت سيطرتك</Text><Text style={styles.noticeBody}>يحفظ التطبيق بياناتك محلياً. لا يبدأ التحويل أو النسخ الاحتياطي أو المشاركة إلا بطلبك.</Text></View></View>
        <Pressable onPress={() => router.push("/storage" as never)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.rowIcon}><MaterialIcons name="storage" size={21} color={appTheme.primary} /></View><View style={styles.rowText}><Text style={styles.rowTitle}>إدارة مساحة التخزين</Text><Text style={styles.rowDetail}>{lectures.length} محاضرة · {formatBytes(knownSize)} معروف الحجم</Text></View><MaterialIcons name="chevron-left" size={22} color="#94A3B8" /></Pressable>
        <View style={styles.limitCard}><View style={styles.limitHeading}><MaterialIcons name="call-split" size={21} color={appTheme.primary} /><View style={styles.rowText}><Text style={styles.rowTitle}>حد تقسيم التسجيل</Text><Text style={styles.rowDetail}>ينشئ التطبيق جزءاً صوتياً جديداً تلقائياً قبل أن يصبح الملف طويلاً.</Text></View></View><View style={styles.limitControls}><TextInput value={partMinutes} onChangeText={setPartMinutes} keyboardType="number-pad" maxLength={2} textAlign="center" style={styles.limitInput} /><Text style={styles.limitUnit}>دقيقة</Text><Pressable onPress={saveRecordingLimit} style={styles.limitSave}><Text style={styles.limitSaveText}>حفظ</Text></Pressable></View></View>
        <View style={styles.backupCard}><View style={styles.backupHeading}><StatusPill label={syncSettings.cloudBackupEnabled ? "اختياري ومفعّل" : "غير مفعّل"} tone={syncSettings.cloudBackupEnabled ? "success" : "neutral"} /><View style={styles.rowText}><Text style={styles.rowTitle}>نسخ احتياطي اختياري</Text><Text style={styles.rowDetail}>{isAuthenticated ? `مرتبط بـ ${user?.name ?? "حسابك"}` : "لا يتم رفع بيانات قبل تسجيل الدخول وموافقتك."}</Text></View><MaterialIcons name="cloud-upload" size={23} color={appTheme.primary} /></View><View style={styles.backupActions}><Pressable onPress={() => void restoreBackup()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>استعادة البيانات</Text></Pressable><View style={styles.backupMain}><PrimaryButton label={saveBackup.isPending ? "يجري النسخ" : "إنشاء نسخة احتياطية"} icon="backup" disabled={saveBackup.isPending} onPress={createBackup} /></View></View><Pressable disabled={restoreEncryptedMedia.isPending} onPress={restoreMediaFiles} style={[styles.restoreMediaButton, restoreEncryptedMedia.isPending && styles.disabled]}><MaterialIcons name="lock-open" size={18} color={appTheme.success} /><Text style={styles.restoreMediaText}>{restoreEncryptedMedia.isPending ? "يجري فك التشفير" : `استعادة الملفات المشفرة${isAuthenticated ? ` (${(encryptedMedia.data ?? []).length})` : ""}`}</Text></Pressable>{syncSettings.lastBackupAt ? <Text style={styles.backupMeta}>آخر نسخة: {new Date(syncSettings.lastBackupAt).toLocaleString("ar")}</Text> : null}</View>
        <SettingRow icon="auto-awesome" title="المعالجة الذكية" detail="تحويل صوت إلى نص وتلخيص منظم عند الطلب." status="عند الطلب" />
        <SettingRow icon="language" title="لغة الواجهة" detail="العربية واتجاه القراءة من اليمين إلى اليسار." status="العربية" />
        <View style={styles.footer}><Text style={styles.footerTitle}>مُحاضِر</Text><Text style={styles.footerText}>دفتر دراسي صوتي يساعدك على حفظ المحاضرة وفهمها ومراجعتها.</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SettingRow({ icon, title, detail, status }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; detail: string; status: string }) {
  return <View style={styles.row}><View style={styles.rowIcon}><MaterialIcons name={icon} size={21} color={appTheme.primary} /></View><View style={styles.rowText}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View><StatusPill label={status} tone="neutral" /></View>;
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 30 }, notice: { alignItems: "flex-start", backgroundColor: appTheme.successSoft, borderRadius: 19, flexDirection: "row-reverse", gap: 12, padding: 16 }, noticeText: { flex: 1 }, noticeTitle: { color: appTheme.success, fontSize: 15, fontWeight: "800", textAlign: "right" }, noticeBody: { color: "#476A64", fontSize: 12, lineHeight: 19, marginTop: 4, textAlign: "right" }, row: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, flexDirection: "row-reverse", gap: 11, padding: 14 }, rowIcon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 13, height: 42, justifyContent: "center", width: 42 }, rowText: { flex: 1 }, rowTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, rowDetail: { color: appTheme.muted, fontSize: 11, lineHeight: 17, marginTop: 3, textAlign: "right" }, limitCard: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, gap: 12, padding: 14 }, limitHeading: { alignItems: "center", flexDirection: "row-reverse", gap: 10 }, limitControls: { alignItems: "center", flexDirection: "row-reverse", gap: 9 }, limitInput: { backgroundColor: "#F8FAFC", borderColor: appTheme.border, borderRadius: 12, borderWidth: 1, color: appTheme.ink, fontSize: 15, fontWeight: "800", height: 42, width: 62 }, limitUnit: { color: appTheme.muted, fontSize: 13, fontWeight: "700" }, limitSave: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 11, justifyContent: "center", marginRight: "auto", minHeight: 42, paddingHorizontal: 16 }, limitSaveText: { color: appTheme.primary, fontSize: 13, fontWeight: "800" }, backupCard: { backgroundColor: appTheme.surface, borderColor: "#C7D2FE", borderRadius: 18, borderWidth: 1, gap: 13, padding: 14 }, backupHeading: { alignItems: "center", flexDirection: "row-reverse", gap: 10 }, backupActions: { flexDirection: "row-reverse", gap: 9 }, backupMain: { flex: 1.5 }, secondaryButton: { alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 15, flex: 1, justifyContent: "center", minHeight: 52 }, secondaryButtonText: { color: appTheme.ink, fontSize: 12, fontWeight: "800" }, restoreMediaButton: { alignItems: "center", backgroundColor: appTheme.successSoft, borderColor: "#99F6E4", borderRadius: 13, borderWidth: 1, flexDirection: "row-reverse", gap: 7, justifyContent: "center", minHeight: 44 }, restoreMediaText: { color: appTheme.success, fontSize: 12, fontWeight: "800" }, backupMeta: { color: appTheme.muted, fontSize: 11, textAlign: "right" }, footer: { alignItems: "center", marginTop: 20, paddingHorizontal: 30 }, footerTitle: { color: appTheme.primary, fontSize: 17, fontWeight: "800" }, footerText: { color: appTheme.muted, fontSize: 12, lineHeight: 19, marginTop: 4, textAlign: "center" }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] }, disabled: { opacity: 0.45 },
});
