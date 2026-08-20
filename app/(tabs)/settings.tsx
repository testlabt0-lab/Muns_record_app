import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppHeader, PrimaryButton, StatusPill } from "@/components/study-ui";
import { startOAuthLogin } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";
import { appTheme } from "@/lib/app-theme";
import { useAppLock } from "@/lib/app-lock";
import { createBackupPayload, parseBackupPayload } from "@/lib/backup-payload";
import { formatBytes } from "@/lib/lecture-export-template";
import { attachmentKindFromMime, persistBase64Attachment } from "@/lib/local-attachments";
import { useStudy } from "@/lib/study-context";
import { cancelWeeklyDigestReminder, notifyBackupOutcome, scheduleWeeklyDigestReminder } from "@/lib/study-reminders";
import { trpc } from "@/lib/trpc";
import { ScreenContainer } from "@/components/screen-container";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { enabled: appLockEnabled, supported: appLockSupported, enable: enableAppLock, disable: disableAppLock } = useAppLock();
  const { years, terms, subjects, lectures, reviewCards, tasks, syncSettings, updateSyncSettings, replaceStoreFromBackup, updateLecture, addAttachment, backupActivities, addBackupActivity } = useStudy();
  const [partMinutes, setPartMinutes] = useState(String(syncSettings.recordingPartMinutes ?? 20));
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<number[]>([]);
  const [restoreProgress, setRestoreProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [activityStatusFilter, setActivityStatusFilter] = useState<"all" | "completed" | "failed">("all");
  const [activityTypeFilter, setActivityTypeFilter] = useState<"all" | "backup" | "restore" | "media">("all");
  const [retentionDays, setRetentionDays] = useState<30 | 90 | 180>(90);
  const [weeklyDigestBusy, setWeeklyDigestBusy] = useState(false);
  const [appLockBusy, setAppLockBusy] = useState(false);
  const saveBackup = trpc.studySync.save.useMutation();
  const loadBackup = trpc.studySync.load.useQuery(undefined, { enabled: false });
  const encryptedMedia = trpc.encryptedMedia.list.useQuery(undefined, { enabled: isAuthenticated });
  const restoreEncryptedMedia = trpc.encryptedMedia.restore.useMutation();
  const deleteEncryptedMedia = trpc.encryptedMedia.remove.useMutation();
  const knownSize = lectures.reduce((sum, lecture) => sum + (lecture.audioSizeBytes ?? 0) + (lecture.attachments ?? []).reduce((attachmentSum, attachment) => attachmentSum + (attachment.sizeBytes ?? 0), 0), 0);
  const visibleActivities = (backupActivities ?? []).filter((activity) => (activityStatusFilter === "all" || activity.status === activityStatusFilter) && (activityTypeFilter === "all" || (activityTypeFilter === "media" ? activity.action.startsWith("media-") : activity.action === activityTypeFilter)));

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
      addBackupActivity({ action: "backup", status: "completed", message: "اكتملت نسخة بيانات الدراسة والنصوص والملخصات." });
      void notifyBackupOutcome("completed", "حُفظت بيانات الدراسة والنصوص والملخصات في النسخة الاختيارية.");
      Alert.alert("تم النسخ الاحتياطي", "حُفظت بيانات الدراسة والنصوص والملخصات في نسختك الاختيارية.");
    } catch { updateSyncSettings({ lastBackupStatus: "failed" }); addBackupActivity({ action: "backup", status: "failed", message: "تعذر إنشاء نسخة بيانات الدراسة." }); void notifyBackupOutcome("failed", "تحقق من الاتصال وتسجيل الدخول ثم أعد المحاولة."); Alert.alert("تعذر النسخ الاحتياطي", "تحقق من تسجيل الدخول والاتصال ثم أعد المحاولة."); }
  };

  const restoreBackup = async () => {
    if (!isAuthenticated) { Alert.alert("تسجيل الدخول مطلوب", "سجّل الدخول لاستعادة النسخة الاحتياطية المرتبطة بحسابك."); return; }
    try {
      const response = await loadBackup.refetch();
      if (!response.data) { Alert.alert("لا توجد نسخة", "لم نعثر على نسخة احتياطية لهذا الحساب بعد."); return; }
      Alert.alert("استعادة بيانات الدراسة", "سيستبدل ذلك الهيكل الدراسي المحلي الحالي، ولا يشمل الملفات المشفرة إلا عبر زر الاستعادة المنفصل.", [{ text: "إلغاء", style: "cancel" }, { text: "استعادة", style: "destructive", onPress: () => { try { replaceStoreFromBackup(parseBackupPayload(response.data!.payload)); addBackupActivity({ action: "restore", status: "completed", message: "استعيدت بيانات الدراسة والنصوص والملخصات." }); Alert.alert("تمت الاستعادة", "أعيدت بيانات الدراسة والنصوص والملخصات إلى هذا الجهاز."); } catch { addBackupActivity({ action: "restore", status: "failed", message: "تعذرت قراءة نسخة بيانات الدراسة." }); Alert.alert("تعذرت الاستعادة", "ملف النسخة غير صالح."); } } }]);
    } catch { Alert.alert("تعذرت الاستعادة", "تحقق من الاتصال ثم أعد المحاولة."); }
  };

  const restoreMediaFiles = () => {
    if (!isAuthenticated) { Alert.alert("تسجيل الدخول مطلوب", "سجّل الدخول لاستعراض واستعادة ملفاتك المشفرة."); return; }
    const files = encryptedMedia.data ?? [];
    if (!files.length) { Alert.alert("لا توجد ملفات مشفرة", "لم نعثر على ملفات صوتية أو مرفقات مشفرة في هذا الحساب."); return; }
    setSelectedMediaIds(files.map((file) => file.id));
    setShowMediaPicker(true);
  };

  const runMediaRestore = async (ids: number[]) => {
    try {
      for (let index = 0; index < ids.length; index += 1) {
        const id = ids[index];
        const file = await restoreEncryptedMedia.mutateAsync({ id });
        setRestoreProgress({ current: index + 1, total: ids.length, fileName: file.fileName });
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
      addBackupActivity({ action: "media-restore", status: "completed", message: "استعيدت الملفات المشفرة إلى المحاضرات المتاحة.", fileCount: ids.length });
      Alert.alert("تمت الاستعادة", "أعيدت الملفات المشفرة إلى مساحة التطبيق وربطت بالمحاضرات المتاحة.");
      await encryptedMedia.refetch();
    } catch { addBackupActivity({ action: "media-restore", status: "failed", message: "تعذرت استعادة الملفات المشفرة المحددة.", fileCount: ids.length }); Alert.alert("تعذرت استعادة الملفات", "تحقق من الاتصال ثم أعد المحاولة."); }
    finally { setRestoreProgress(null); }
  };

  const toggleMedia = (id: number) => setSelectedMediaIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleAllMedia = () => setSelectedMediaIds((current) => current.length === (encryptedMedia.data ?? []).length ? [] : (encryptedMedia.data ?? []).map((file) => file.id));
  const removeMediaFile = (id: number, fileName: string) => Alert.alert("حذف نسخة مشفرة", `سيُزال الوصول إلى النسخة المشفرة «${fileName}» من حسابك. لا يمكن التراجع عن هذا الإجراء.`, [{ text: "إلغاء", style: "cancel" }, { text: "حذف النسخة", style: "destructive", onPress: () => void (async () => { try { await deleteEncryptedMedia.mutateAsync({ id }); setSelectedMediaIds((current) => current.filter((item) => item !== id)); await encryptedMedia.refetch(); addBackupActivity({ action: "media-backup", status: "completed", message: `حُذفت النسخة المشفرة «${fileName}».` }); } catch { Alert.alert("تعذر حذف النسخة", "تحقق من الاتصال ثم أعد المحاولة."); } })() }]);

  const removeExpiredMedia = () => {
    const expiresBefore = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const expired = (encryptedMedia.data ?? []).filter((file) => new Date(file.createdAt).getTime() < expiresBefore);
    if (!expired.length) { Alert.alert("لا توجد نسخ قديمة", `لا توجد نسخ مشفرة أقدم من ${retentionDays} يوماً في حسابك.`); return; }
    Alert.alert("تأكيد سياسة الاحتفاظ", `سيُزال الوصول إلى ${expired.length} نسخة مشفرة أقدم من ${retentionDays} يوماً. لا يمكن التراجع عن هذا الإجراء.`, [{ text: "إلغاء", style: "cancel" }, { text: "حذف النسخ القديمة", style: "destructive", onPress: () => void runExpiredMediaRemoval(expired) }]);
  };

  const runExpiredMediaRemoval = async (files: Array<{ id: number; fileName: string }>) => {
    const failed: string[] = [];
    for (const file of files) { try { await deleteEncryptedMedia.mutateAsync({ id: file.id }); } catch { failed.push(file.fileName); } }
    setSelectedMediaIds((current) => current.filter((id) => !files.some((file) => file.id === id)));
    await encryptedMedia.refetch();
    const deletedCount = files.length - failed.length;
    addBackupActivity({ action: "media-backup", status: failed.length ? "failed" : "completed", message: failed.length ? `حُذفت ${deletedCount} نسخة قديمة وتعذر حذف ${failed.length}.` : `حُذفت ${deletedCount} نسخة مشفرة قديمة وفق سياسة الاحتفاظ.`, fileCount: files.length });
    Alert.alert(failed.length ? "اكتمل الحذف جزئياً" : "تم تطبيق سياسة الاحتفاظ", failed.length ? `حُذفت ${deletedCount} نسخة؛ تعذر حذف ${failed.length} نسخة ويمكن إعادة المحاولة لاحقاً.` : `حُذفت ${deletedCount} نسخة مشفرة قديمة.`);
  };

  const saveRecordingLimit = () => {
    const value = Number(partMinutes);
    if (!Number.isInteger(value) || value < 5 || value > 60) { Alert.alert("قيمة غير صالحة", "اختر عدداً صحيحاً بين 5 و60 دقيقة لكل جزء."); return; }
    updateSyncSettings({ recordingPartMinutes: value });
    Alert.alert("تم حفظ الحد", `سيبدأ جزء صوتي جديد تلقائياً كل ${value} دقيقة.`);
  };

  const toggleAppLock = async () => {
    if (appLockBusy) return;
    if (!appLockSupported) { Alert.alert("غير متاح في الويب", "قفل الجهاز يعمل في تطبيق iOS أو Android فقط."); return; }
    setAppLockBusy(true);
    try {
      if (appLockEnabled) { await disableAppLock(); Alert.alert("تم إيقاف قفل التطبيق", "لن يطلب التطبيق التحقق عند العودة من الخلفية."); }
      else { await enableAppLock(); Alert.alert("تم تفعيل قفل التطبيق", "سيطلب التطبيق البصمة أو رمز قفل جهازك عند العودة من الخلفية."); }
    } catch (error) { Alert.alert("تعذر تحديث القفل", error instanceof Error ? error.message : "حاول مرة أخرى من جهاز الهاتف."); }
    finally { setAppLockBusy(false); }
  };

  const toggleWeeklyDigest = async () => {
    if (weeklyDigestBusy) return;
    setWeeklyDigestBusy(true);
    try {
      if (syncSettings.weeklyDigestEnabled) {
        await cancelWeeklyDigestReminder(syncSettings.weeklyDigestNotificationId);
        updateSyncSettings({ weeklyDigestEnabled: false, weeklyDigestNotificationId: undefined });
        Alert.alert("تم إيقاف الملخص الأسبوعي", "لن يُرسل التطبيق تذكيراً أسبوعياً بعد الآن.");
      } else {
        const notificationId = await scheduleWeeklyDigestReminder();
        if (!notificationId) { Alert.alert("لم يمنح الإذن", "اسمح للتطبيق بإرسال التنبيهات لتفعيل الملخص الأسبوعي."); return; }
        updateSyncSettings({ weeklyDigestEnabled: true, weeklyDigestNotificationId: notificationId });
        Alert.alert("تم تفعيل الملخص الأسبوعي", "سيصلك تذكير محلي كل أحد مساءً لفتح ملخص المحاضرات والتخزين.");
      }
    } catch { Alert.alert("تعذر تحديث التذكير", "حاول مرة أخرى من جهاز الهاتف."); }
    finally { setWeeklyDigestBusy(false); }
  };

  return (
    <ScreenContainer className="px-5">
      <AppHeader eyebrow="التحكم والخصوصية" title="الإعدادات" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.notice}><MaterialIcons name="verified-user" size={23} color={appTheme.success} /><View style={styles.noticeText}><Text style={styles.noticeTitle}>ملفاتك تحت سيطرتك</Text><Text style={styles.noticeBody}>يحفظ التطبيق بياناتك محلياً. لا يبدأ التحويل أو النسخ الاحتياطي أو المشاركة إلا بطلبك.</Text></View></View>
        <View style={styles.limitCard}><View style={styles.limitHeading}><MaterialIcons name="fingerprint" size={21} color={appTheme.primary} /><View style={styles.rowText}><Text style={styles.rowTitle}>قفل التطبيق</Text><Text style={styles.rowDetail}>يستخدم البصمة أو رمز قفل الجهاز لحماية المحاضرات عند العودة من الخلفية.</Text></View><StatusPill label={appLockEnabled ? "مفعّل" : "غير مفعّل"} tone={appLockEnabled ? "success" : "neutral"} /></View><Pressable disabled={appLockBusy} onPress={() => void toggleAppLock()} style={[styles.restoreMediaButton, appLockBusy && styles.disabled]}><MaterialIcons name={appLockEnabled ? "lock-open" : "lock"} size={18} color={appTheme.success} /><Text style={styles.restoreMediaText}>{appLockBusy ? "يجري التحقق" : appLockEnabled ? "إيقاف قفل التطبيق" : "تفعيل قفل التطبيق"}</Text></Pressable></View>
        <Pressable onPress={() => router.push("/storage" as never)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.rowIcon}><MaterialIcons name="storage" size={21} color={appTheme.primary} /></View><View style={styles.rowText}><Text style={styles.rowTitle}>إدارة مساحة التخزين</Text><Text style={styles.rowDetail}>{lectures.length} محاضرة · {formatBytes(knownSize)} معروف الحجم</Text></View><MaterialIcons name="chevron-left" size={22} color="#94A3B8" /></Pressable>
        <View style={styles.limitCard}><View style={styles.limitHeading}><MaterialIcons name="call-split" size={21} color={appTheme.primary} /><View style={styles.rowText}><Text style={styles.rowTitle}>حد تقسيم التسجيل</Text><Text style={styles.rowDetail}>ينشئ التطبيق جزءاً صوتياً جديداً تلقائياً قبل أن يصبح الملف طويلاً.</Text></View></View><View style={styles.limitControls}><TextInput value={partMinutes} onChangeText={setPartMinutes} keyboardType="number-pad" maxLength={2} textAlign="center" style={styles.limitInput} /><Text style={styles.limitUnit}>دقيقة</Text><Pressable onPress={saveRecordingLimit} style={styles.limitSave}><Text style={styles.limitSaveText}>حفظ</Text></Pressable></View></View>
        <View style={styles.backupCard}><View style={styles.backupHeading}><StatusPill label={syncSettings.cloudBackupEnabled ? "اختياري ومفعّل" : "غير مفعّل"} tone={syncSettings.cloudBackupEnabled ? "success" : "neutral"} /><View style={styles.rowText}><Text style={styles.rowTitle}>نسخ احتياطي اختياري</Text><Text style={styles.rowDetail}>{isAuthenticated ? `مرتبط بـ ${user?.name ?? "حسابك"}` : "لا يتم رفع بيانات قبل تسجيل الدخول وموافقتك."}</Text></View><MaterialIcons name="cloud-upload" size={23} color={appTheme.primary} /></View><View style={styles.backupActions}><Pressable onPress={() => void restoreBackup()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>استعادة البيانات</Text></Pressable><View style={styles.backupMain}><PrimaryButton label={saveBackup.isPending ? "يجري النسخ" : "إنشاء نسخة احتياطية"} icon="backup" disabled={saveBackup.isPending} onPress={createBackup} /></View></View><Pressable disabled={restoreEncryptedMedia.isPending} onPress={restoreMediaFiles} style={[styles.restoreMediaButton, restoreEncryptedMedia.isPending && styles.disabled]}><MaterialIcons name="lock-open" size={18} color={appTheme.success} /><Text style={styles.restoreMediaText}>{restoreProgress ? `استعادة ${restoreProgress.current}/${restoreProgress.total}: ${restoreProgress.fileName}` : `اختيار واستعادة الملفات المشفرة${isAuthenticated ? ` (${(encryptedMedia.data ?? []).length})` : ""}`}</Text></Pressable>{syncSettings.lastBackupAt ? <Text style={styles.backupMeta}>آخر نسخة: {new Date(syncSettings.lastBackupAt).toLocaleString("ar")}</Text> : null}<View style={styles.activityFilters}><Pressable onPress={() => setActivityStatusFilter("all")} style={[styles.activityChip, activityStatusFilter === "all" && styles.activityChipActive]}><Text style={[styles.activityChipText, activityStatusFilter === "all" && styles.activityChipTextActive]}>الكل</Text></Pressable><Pressable onPress={() => setActivityStatusFilter("completed")} style={[styles.activityChip, activityStatusFilter === "completed" && styles.activityChipActive]}><Text style={[styles.activityChipText, activityStatusFilter === "completed" && styles.activityChipTextActive]}>ناجح</Text></Pressable><Pressable onPress={() => setActivityStatusFilter("failed")} style={[styles.activityChip, activityStatusFilter === "failed" && styles.activityChipActive]}><Text style={[styles.activityChipText, activityStatusFilter === "failed" && styles.activityChipTextActive]}>فاشل</Text></Pressable><Pressable onPress={() => setActivityTypeFilter(activityTypeFilter === "media" ? "all" : "media")} style={[styles.activityChip, activityTypeFilter === "media" && styles.activityChipActive]}><Text style={[styles.activityChipText, activityTypeFilter === "media" && styles.activityChipTextActive]}>ملفات</Text></Pressable></View>{visibleActivities.slice(0, 6).map((activity) => <View key={activity.id} style={styles.activityRow}><MaterialIcons name={activity.status === "completed" ? "check-circle" : "error-outline"} size={16} color={activity.status === "completed" ? appTheme.success : appTheme.danger} /><View style={styles.rowText}><Text style={styles.activityText}>{activity.message}</Text><Text style={styles.activityTime}>{new Date(activity.createdAt).toLocaleString("ar")}</Text></View></View>)}</View>
        <View style={styles.limitCard}><View style={styles.limitHeading}><MaterialIcons name="history" size={21} color={appTheme.warning} /><View style={styles.rowText}><Text style={styles.rowTitle}>سياسة الاحتفاظ بالنسخ المشفرة</Text><Text style={styles.rowDetail}>احذف يدوياً النسخ الأقدم بعد تأكيدك. لا تُنفذ العملية تلقائياً.</Text></View></View><View style={styles.sortRow}>{([30, 90, 180] as const).map((days) => <Pressable key={days} onPress={() => setRetentionDays(days)} style={[styles.sortChip, retentionDays === days && styles.sortChipActive]}><Text style={[styles.sortChipText, retentionDays === days && styles.sortChipTextActive]}>{days} يوماً</Text></Pressable>)}</View><Pressable disabled={!isAuthenticated || deleteEncryptedMedia.isPending} onPress={removeExpiredMedia} style={[styles.restoreMediaButton, (!isAuthenticated || deleteEncryptedMedia.isPending) && styles.disabled]}><MaterialIcons name="delete-sweep" size={18} color={appTheme.success} /><Text style={styles.restoreMediaText}>مراجعة وحذف النسخ الأقدم من {retentionDays} يوماً</Text></Pressable></View>
        <View style={styles.limitCard}><View style={styles.limitHeading}><MaterialIcons name="event-note" size={21} color={appTheme.violet} /><View style={styles.rowText}><Text style={styles.rowTitle}>ملخص أسبوعي اختياري</Text><Text style={styles.rowDetail}>تذكير محلي كل أحد مساءً لفتح ملخص المحاضرات الجديدة ومساحة التخزين. لا يُرفع أي محتوى.</Text></View><StatusPill label={syncSettings.weeklyDigestEnabled ? "مفعّل" : "غير مفعّل"} tone={syncSettings.weeklyDigestEnabled ? "success" : "neutral"} /></View><Pressable disabled={weeklyDigestBusy} onPress={() => void toggleWeeklyDigest()} style={[styles.restoreMediaButton, weeklyDigestBusy && styles.disabled]}><MaterialIcons name={syncSettings.weeklyDigestEnabled ? "notifications-off" : "notifications-active"} size={18} color={appTheme.success} /><Text style={styles.restoreMediaText}>{weeklyDigestBusy ? "يجري التحديث" : syncSettings.weeklyDigestEnabled ? "إيقاف الملخص الأسبوعي" : "تفعيل الملخص الأسبوعي"}</Text></Pressable></View>
        <SettingRow icon="auto-awesome" title="المعالجة الذكية" detail="تحويل صوت إلى نص وتلخيص منظم عند الطلب." status="عند الطلب" />
        <SettingRow icon="language" title="لغة الواجهة" detail="العربية واتجاه القراءة من اليمين إلى اليسار." status="العربية" />
        <View style={styles.footer}><Text style={styles.footerTitle}>مُحاضِر</Text><Text style={styles.footerText}>دفتر دراسي صوتي يساعدك على حفظ المحاضرة وفهمها ومراجعتها.</Text></View>
      </ScrollView>
      <MediaRestorePicker visible={showMediaPicker} files={encryptedMedia.data ?? []} selectedIds={selectedMediaIds} busy={restoreEncryptedMedia.isPending || deleteEncryptedMedia.isPending} onClose={() => setShowMediaPicker(false)} onToggle={toggleMedia} onToggleAll={toggleAllMedia} onDelete={removeMediaFile} onRestore={() => { setShowMediaPicker(false); void runMediaRestore(selectedMediaIds); }} />
    </ScreenContainer>
  );
}

function SettingRow({ icon, title, detail, status }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; detail: string; status: string }) {
  return <View style={styles.row}><View style={styles.rowIcon}><MaterialIcons name={icon} size={21} color={appTheme.primary} /></View><View style={styles.rowText}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View><StatusPill label={status} tone="neutral" /></View>;
}

function MediaRestorePicker({ visible, files, selectedIds, busy, onClose, onToggle, onToggleAll, onDelete, onRestore }: { visible: boolean; files: Array<{ id: number; fileName: string; contentType: string; originalSize: number; createdAt: Date | string }>; selectedIds: number[]; busy: boolean; onClose: () => void; onToggle: (id: number) => void; onToggleAll: () => void; onDelete: (id: number, fileName: string) => void; onRestore: () => void }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "largest">("recent");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleFiles = files.filter((file) => file.fileName.toLowerCase().includes(normalizedQuery)).sort((a, b) => sort === "largest" ? b.originalSize - a.originalSize : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const allSelected = files.length > 0 && selectedIds.length === files.length;
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><View style={styles.modal}><View style={styles.modalHeader}><Pressable onPress={onClose} style={styles.closeButton}><MaterialIcons name="close" size={22} color={appTheme.ink} /></Pressable><Text style={styles.modalTitle}>اختر الملفات لاستعادتها</Text><View style={styles.closeButton} /></View><View style={styles.pickerTools}><View style={styles.searchBox}><MaterialIcons name="search" size={19} color={appTheme.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="ابحث باسم الملف" placeholderTextColor="#94A3B8" textAlign="right" style={styles.searchInput} /></View><View style={styles.sortRow}><Pressable onPress={() => setSort("recent")} style={[styles.sortChip, sort === "recent" && styles.sortChipActive]}><Text style={[styles.sortChipText, sort === "recent" && styles.sortChipTextActive]}>الأحدث</Text></Pressable><Pressable onPress={() => setSort("largest")} style={[styles.sortChip, sort === "largest" && styles.sortChipActive]}><Text style={[styles.sortChipText, sort === "largest" && styles.sortChipTextActive]}>الأكبر حجماً</Text></Pressable><Pressable onPress={onToggleAll} style={styles.selectAllChip}><Text style={styles.selectAllText}>{allSelected ? "إلغاء التحديد" : "تحديد الكل"}</Text></Pressable></View></View><ScrollView contentContainerStyle={styles.modalList}>{visibleFiles.length ? visibleFiles.map((file) => { const chosen = selectedIds.includes(file.id); return <View key={file.id} style={[styles.mediaChoice, chosen && styles.mediaChoiceSelected]}><Pressable onPress={() => onToggle(file.id)} style={styles.mediaMain}><View style={[styles.check, chosen && styles.checkSelected]}>{chosen ? <MaterialIcons name="check" size={15} color="#FFFFFF" /> : null}</View><View style={styles.rowText}><Text style={styles.mediaName} numberOfLines={1}>{file.fileName}</Text><Text style={styles.mediaMeta}>{file.contentType.startsWith("audio/") ? "تسجيل صوتي" : "مرفق"} · {formatBytes(file.originalSize)}</Text></View><MaterialIcons name={file.contentType.startsWith("audio/") ? "graphic-eq" : "attach-file"} size={20} color={appTheme.primary} /></Pressable><Pressable onPress={() => onDelete(file.id, file.fileName)} style={styles.mediaDelete}><MaterialIcons name="delete-outline" size={19} color={appTheme.danger} /></Pressable></View>; }) : <View style={styles.noResults}><MaterialIcons name="manage-search" size={28} color={appTheme.muted} /><Text style={styles.noResultsText}>لا توجد ملفات مطابقة للبحث.</Text></View>}</ScrollView><View style={styles.modalFooter}><PrimaryButton label={`استعادة ${selectedIds.length} ملف`} icon="lock-open" disabled={!selectedIds.length || busy} onPress={onRestore} /></View></View></Modal>;
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 30 }, notice: { alignItems: "flex-start", backgroundColor: appTheme.successSoft, borderRadius: 19, flexDirection: "row-reverse", gap: 12, padding: 16 }, noticeText: { flex: 1 }, noticeTitle: { color: appTheme.success, fontSize: 15, fontWeight: "800", textAlign: "right" }, noticeBody: { color: "#476A64", fontSize: 12, lineHeight: 19, marginTop: 4, textAlign: "right" }, row: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, flexDirection: "row-reverse", gap: 11, padding: 14 }, rowIcon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 13, height: 42, justifyContent: "center", width: 42 }, rowText: { flex: 1 }, rowTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, rowDetail: { color: appTheme.muted, fontSize: 11, lineHeight: 17, marginTop: 3, textAlign: "right" }, activityFilters: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, marginTop: 4 }, activityChip: { backgroundColor: "#F1F5F9", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 }, activityChipActive: { backgroundColor: appTheme.primarySoft }, activityChipText: { color: appTheme.muted, fontSize: 11, fontWeight: "800" }, activityChipTextActive: { color: appTheme.primary }, activityRow: { alignItems: "flex-start", backgroundColor: "#F8FAFC", borderRadius: 11, flexDirection: "row-reverse", gap: 7, padding: 9 }, activityText: { color: appTheme.ink, fontSize: 11, fontWeight: "700", textAlign: "right" }, activityTime: { color: appTheme.muted, fontSize: 10, marginTop: 2, textAlign: "right" }, limitCard: { backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, gap: 12, padding: 14 }, limitHeading: { alignItems: "center", flexDirection: "row-reverse", gap: 10 }, limitControls: { alignItems: "center", flexDirection: "row-reverse", gap: 9 }, limitInput: { backgroundColor: "#F8FAFC", borderColor: appTheme.border, borderRadius: 12, borderWidth: 1, color: appTheme.ink, fontSize: 15, fontWeight: "800", height: 42, width: 62 }, limitUnit: { color: appTheme.muted, fontSize: 13, fontWeight: "700" }, limitSave: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 11, justifyContent: "center", marginRight: "auto", minHeight: 42, paddingHorizontal: 16 }, limitSaveText: { color: appTheme.primary, fontSize: 13, fontWeight: "800" }, backupCard: { backgroundColor: appTheme.surface, borderColor: "#C7D2FE", borderRadius: 18, borderWidth: 1, gap: 13, padding: 14 }, backupHeading: { alignItems: "center", flexDirection: "row-reverse", gap: 10 }, backupActions: { flexDirection: "row-reverse", gap: 9 }, backupMain: { flex: 1.5 }, secondaryButton: { alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 15, flex: 1, justifyContent: "center", minHeight: 52 }, secondaryButtonText: { color: appTheme.ink, fontSize: 12, fontWeight: "800" }, restoreMediaButton: { alignItems: "center", backgroundColor: appTheme.successSoft, borderColor: "#99F6E4", borderRadius: 13, borderWidth: 1, flexDirection: "row-reverse", gap: 7, justifyContent: "center", minHeight: 44 }, restoreMediaText: { color: appTheme.success, fontSize: 12, fontWeight: "800", textAlign: "center" }, backupMeta: { color: appTheme.muted, fontSize: 11, textAlign: "right" }, footer: { alignItems: "center", marginTop: 20, paddingHorizontal: 30 }, footerTitle: { color: appTheme.primary, fontSize: 17, fontWeight: "800" }, footerText: { color: appTheme.muted, fontSize: 12, lineHeight: 19, marginTop: 4, textAlign: "center" }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] }, disabled: { opacity: 0.45 }, modal: { backgroundColor: appTheme.background, flex: 1 }, modalHeader: { alignItems: "center", backgroundColor: appTheme.surface, borderBottomColor: appTheme.border, borderBottomWidth: 1, flexDirection: "row-reverse", justifyContent: "space-between", padding: 18 }, modalTitle: { color: appTheme.ink, fontSize: 17, fontWeight: "800" }, closeButton: { alignItems: "center", height: 38, justifyContent: "center", width: 38 }, pickerTools: { backgroundColor: appTheme.surface, borderBottomColor: appTheme.border, borderBottomWidth: 1, gap: 10, padding: 14 }, searchBox: { alignItems: "center", backgroundColor: "#F8FAFC", borderColor: appTheme.border, borderRadius: 12, borderWidth: 1, flexDirection: "row-reverse", gap: 8, paddingHorizontal: 11 }, searchInput: { color: appTheme.ink, flex: 1, fontSize: 14, minHeight: 42 }, sortRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }, sortChip: { backgroundColor: "#F1F5F9", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8 }, sortChipActive: { backgroundColor: appTheme.primarySoft }, sortChipText: { color: appTheme.muted, fontSize: 12, fontWeight: "800" }, sortChipTextActive: { color: appTheme.primary }, selectAllChip: { backgroundColor: appTheme.successSoft, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8 }, selectAllText: { color: appTheme.success, fontSize: 12, fontWeight: "800" }, modalList: { gap: 9, padding: 18, paddingBottom: 96 }, mediaChoice: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 15, borderWidth: 1, flexDirection: "row-reverse", gap: 10, padding: 13 }, mediaChoiceSelected: { borderColor: "#818CF8", backgroundColor: "#F5F3FF" }, mediaMain: { alignItems: "center", flex: 1, flexDirection: "row-reverse", gap: 10 }, mediaDelete: { alignItems: "center", height: 36, justifyContent: "center", width: 36 }, check: { alignItems: "center", borderColor: "#CBD5E1", borderRadius: 9, borderWidth: 1, height: 22, justifyContent: "center", width: 22 }, checkSelected: { backgroundColor: appTheme.primary, borderColor: appTheme.primary }, mediaName: { color: appTheme.ink, fontSize: 13, fontWeight: "800", textAlign: "right" }, mediaMeta: { color: appTheme.muted, fontSize: 11, marginTop: 3, textAlign: "right" }, noResults: { alignItems: "center", gap: 8, paddingTop: 44 }, noResultsText: { color: appTheme.muted, fontSize: 13, fontWeight: "700" }, modalFooter: { backgroundColor: appTheme.surface, borderTopColor: appTheme.border, borderTopWidth: 1, bottom: 0, left: 0, padding: 16, position: "absolute", right: 0 },
});
