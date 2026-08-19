import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader, PrimaryButton, StatusPill } from "@/components/study-ui";
import { startOAuthLogin } from "@/constants/oauth";
import { appTheme } from "@/lib/app-theme";
import { createBackupPayload, parseBackupPayload } from "@/lib/backup-payload";
import { formatBytes } from "@/lib/lecture-export-template";
import { useStudy } from "@/lib/study-context";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { ScreenContainer } from "@/components/screen-container";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { years, terms, subjects, lectures, reviewCards, tasks, syncSettings, updateSyncSettings, replaceStoreFromBackup } = useStudy();
  const saveBackup = trpc.studySync.save.useMutation();
  const loadBackup = trpc.studySync.load.useQuery(undefined, { enabled: false });
  const knownSize = lectures.reduce((sum, lecture) => sum + (lecture.audioSizeBytes ?? 0) + (lecture.attachments ?? []).reduce((attachmentSum, attachment) => attachmentSum + (attachment.sizeBytes ?? 0), 0), 0);

  const createBackup = async () => {
    if (!isAuthenticated) {
      Alert.alert("تسجيل الدخول مطلوب", "النسخ الاحتياطي اختياري. سجّل الدخول أولاً لربط النسخة بحسابك.", [{ text: "إلغاء", style: "cancel" }, { text: "تسجيل الدخول", onPress: () => void startOAuthLogin() }]);
      return;
    }
    Alert.alert("تأكيد النسخ الاحتياطي", "سيُرفع تنظيم الدراسة والنصوص والملخصات. تبقى ملفات الصوت والمرفقات على جهازك في هذه النسخة المحلية أولاً.", [{ text: "إلغاء", style: "cancel" }, { text: "إنشاء نسخة", onPress: () => void runBackup() }]);
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
      const backupPayload = response.data.payload;
      Alert.alert("استعادة النسخة", "سيستبدل ذلك بيانات الدراسة المحلية الحالية. لا تشمل النسخة الحالية ملفات الصوت والمرفقات.", [{ text: "إلغاء", style: "cancel" }, { text: "استعادة", style: "destructive", onPress: () => { try { replaceStoreFromBackup(parseBackupPayload(backupPayload)); Alert.alert("تمت الاستعادة", "أعيدت بيانات الدراسة والنصوص والملخصات إلى هذا الجهاز."); } catch { Alert.alert("تعذرت الاستعادة", "ملف النسخة غير صالح."); } } }]);
    } catch { Alert.alert("تعذرت الاستعادة", "تحقق من الاتصال ثم أعد المحاولة."); }
  };

  return <ScreenContainer className="px-5"><AppHeader eyebrow="التحكم والخصوصية" title="الإعدادات" /><ScrollView contentContainerStyle={styles.content}><View style={styles.notice}><MaterialIcons name="verified-user" size={23} color={appTheme.success} /><View style={styles.noticeText}><Text style={styles.noticeTitle}>ملفاتك تحت سيطرتك</Text><Text style={styles.noticeBody}>يحفظ التطبيق بنية دراستك وتسجيلاتك محلياً. لا يبدأ التحويل أو النسخ الاحتياطي أو المشاركة إلا بطلبك.</Text></View></View><Pressable onPress={() => router.push("/storage" as never)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.rowIcon}><MaterialIcons name="storage" size={21} color={appTheme.primary} /></View><View style={styles.rowText}><Text style={styles.rowTitle}>إدارة مساحة التخزين</Text><Text style={styles.rowDetail}>{lectures.length} محاضرة · {formatBytes(knownSize)} معروف الحجم</Text></View><MaterialIcons name="chevron-left" size={22} color="#94A3B8" /></Pressable><View style={styles.backupCard}><View style={styles.backupHeading}><StatusPill label={syncSettings.cloudBackupEnabled ? "اختياري ومفعّل" : "غير مفعّل"} tone={syncSettings.cloudBackupEnabled ? "success" : "neutral"} /><View style={styles.backupTitleWrap}><Text style={styles.rowTitle}>نسخ احتياطي اختياري</Text><Text style={styles.rowDetail}>{isAuthenticated ? `مرتبط بـ ${user?.name ?? "حسابك"}` : "لا يتم رفع أي بيانات قبل تسجيل الدخول وموافقتك."}</Text></View><MaterialIcons name="cloud-upload" size={23} color={appTheme.primary} /></View><View style={styles.backupActions}><Pressable onPress={() => void restoreBackup()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>استعادة نسخة</Text></Pressable><View style={styles.backupMain}><PrimaryButton label={saveBackup.isPending ? "يجري النسخ" : "إنشاء نسخة احتياطية"} icon="backup" disabled={saveBackup.isPending} onPress={() => void createBackup()} /></View></View>{syncSettings.lastBackupAt ? <Text style={styles.backupMeta}>آخر نسخة: {new Date(syncSettings.lastBackupAt).toLocaleString("ar")}</Text> : null}</View><SettingRow icon="auto-awesome" title="المعالجة الذكية" detail="تحويل صوت إلى نص وتلخيص منظم عند الطلب." status="عند الطلب" /><SettingRow icon="language" title="لغة الواجهة" detail="العربية واتجاه القراءة من اليمين إلى اليسار." status="العربية" /><View style={styles.footer}><Text style={styles.footerTitle}>مُحاضِر</Text><Text style={styles.footerText}>دفتر دراسي صوتي يساعدك على حفظ المحاضرة وفهمها ومراجعتها.</Text></View></ScrollView></ScreenContainer>;
}

function SettingRow({ icon, title, detail, status }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; detail: string; status: string }) { return <View style={styles.row}><View style={styles.rowIcon}><MaterialIcons name={icon} size={21} color={appTheme.primary} /></View><View style={styles.rowText}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View><StatusPill label={status} tone="neutral" /></View>; }
const styles = StyleSheet.create({ content: { gap: 12, paddingBottom: 30 }, notice: { alignItems: "flex-start", backgroundColor: appTheme.successSoft, borderRadius: 19, flexDirection: "row-reverse", gap: 12, padding: 16 }, noticeText: { flex: 1 }, noticeTitle: { color: appTheme.success, fontSize: 15, fontWeight: "800", textAlign: "right" }, noticeBody: { color: "#476A64", fontSize: 12, lineHeight: 19, marginTop: 4, textAlign: "right" }, row: { alignItems: "center", backgroundColor: appTheme.surface, borderColor: appTheme.border, borderRadius: 18, borderWidth: 1, flexDirection: "row-reverse", gap: 11, padding: 14 }, rowIcon: { alignItems: "center", backgroundColor: appTheme.primarySoft, borderRadius: 13, height: 42, justifyContent: "center", width: 42 }, rowText: { flex: 1 }, rowTitle: { color: appTheme.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, rowDetail: { color: appTheme.muted, fontSize: 11, lineHeight: 17, marginTop: 3, textAlign: "right" }, backupCard: { backgroundColor: appTheme.surface, borderColor: "#C7D2FE", borderRadius: 18, borderWidth: 1, gap: 13, padding: 14 }, backupHeading: { alignItems: "center", flexDirection: "row-reverse", gap: 10 }, backupTitleWrap: { flex: 1 }, backupActions: { flexDirection: "row-reverse", gap: 9 }, backupMain: { flex: 1.5 }, secondaryButton: { alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 15, flex: 1, justifyContent: "center", minHeight: 52 }, secondaryButtonText: { color: appTheme.ink, fontSize: 12, fontWeight: "800" }, backupMeta: { color: appTheme.muted, fontSize: 11, textAlign: "right" }, footer: { alignItems: "center", marginTop: 20, paddingHorizontal: 30 }, footerTitle: { color: appTheme.primary, fontSize: 17, fontWeight: "800" }, footerText: { color: appTheme.muted, fontSize: 12, lineHeight: 19, marginTop: 4, textAlign: "center" }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] } });
