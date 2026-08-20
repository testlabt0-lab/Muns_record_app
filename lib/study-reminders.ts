import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { normalizeWeeklyReviewDays } from "./review-plan-reminders";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function scheduleStudyReminder(title: string, dueAt: string, taskId: string) {
  if (Platform.OS === "web") return undefined;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return undefined;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("study-reminders", { name: "تذكيرات الدراسة", importance: Notifications.AndroidImportance.DEFAULT });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return undefined;
  return Notifications.scheduleNotificationAsync({
    content: { title: "تذكير دراسي", body: title, data: { taskId, url: "/planner" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: "study-reminders" },
  });
}

export async function cancelStudyReminder(notificationId?: string) {
  if (notificationId && Platform.OS !== "web") await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function scheduleReviewSessionReminder(seconds: number) {
  if (Platform.OS === "web" || !Number.isFinite(seconds) || seconds < 1) return undefined;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("study-review", { name: "جلسات المراجعة", importance: Notifications.AndroidImportance.DEFAULT });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return undefined;
  return Notifications.scheduleNotificationAsync({
    content: { title: "انتهت جلسة المراجعة", body: "أحسنت، خذ استراحة قصيرة ثم واصل دراستك.", data: { url: "/review" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + Math.ceil(seconds) * 1000), channelId: "study-review" },
  });
}

export async function cancelReviewSessionReminder(notificationId?: string) {
  if (notificationId && Platform.OS !== "web") await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function notifyBackupOutcome(status: "completed" | "failed", message: string) {
  if (Platform.OS === "web") return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("study-backups", { name: "حالة النسخ الاحتياطي", importance: Notifications.AndroidImportance.DEFAULT });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return;
  await Notifications.scheduleNotificationAsync({
    content: { title: status === "completed" ? "اكتملت النسخة الاحتياطية" : "تعذر النسخ الاحتياطي", body: message, data: { url: "/settings" } },
    trigger: null,
  });
}

export async function notifyWeeklyGoalReached() {
  if (Platform.OS === "web") return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("study-goals", { name: "أهداف الدراسة", importance: Notifications.AndroidImportance.DEFAULT });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return;
  await Notifications.scheduleNotificationAsync({
    content: { title: "أكملت أهداف الأسبوع", body: "أحسنت، حققت هدف المحاضرات وبطاقات المراجعة لهذا الأسبوع.", data: { url: "/weekly-summary" } },
    trigger: null,
  });
}

export async function notifySubjectGoalNear(subjectTitle: string, metricLabels: string[]) {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("study-subject-goals", { name: "أهداف المواد", importance: Notifications.AndroidImportance.DEFAULT });
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return false;
  await Notifications.scheduleNotificationAsync({ content: { title: `اقتربت من هدف ${subjectTitle}`, body: `تبقّى القليل لإتمام: ${metricLabels.join("، ")}.`, data: { url: "/subject" } }, trigger: null });
  return true;
}

export async function scheduleWeeklyDigestReminder() {
  if (Platform.OS === "web") return undefined;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("study-weekly", { name: "ملخص أسبوعي", importance: Notifications.AndroidImportance.DEFAULT });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return undefined;
  return Notifications.scheduleNotificationAsync({
    content: { title: "ملخصك الأسبوعي جاهز", body: "افتح مُحاضِر لمراجعة المحاضرات الجديدة والمراجعة والتخزين لهذا الأسبوع.", data: { url: "/weekly-summary" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 19, minute: 0, channelId: "study-weekly" },
  });
}

export async function cancelWeeklyDigestReminder(notificationId?: string) {
  if (notificationId && Platform.OS !== "web") await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function scheduleDailyFocusReminder() {
  if (Platform.OS === "web") return undefined;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("study-focus", { name: "تحدي التركيز", importance: Notifications.AndroidImportance.DEFAULT });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return undefined;
  return Notifications.scheduleNotificationAsync({
    content: { title: "تحدي التركيز اليومي", body: "خصص دقائق قليلة لمراجعة محاضراتك اليوم.", data: { url: "/review" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 0, channelId: "study-focus" },
  });
}

export async function cancelDailyFocusReminder(notificationId?: string) {
  if (notificationId && Platform.OS !== "web") await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function scheduleWeeklyReviewPlanReminders(days: number[], hour = 18, minute = 0) {
  const reviewDays = normalizeWeeklyReviewDays(days);
  if (Platform.OS === "web" || !reviewDays.length) return undefined;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("study-review-plan", { name: "خطة المراجعة", importance: Notifications.AndroidImportance.DEFAULT });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return undefined;
  return Promise.all(reviewDays.map((day) => Notifications.scheduleNotificationAsync({
    content: { title: "موعد المراجعة", body: "اليوم ضمن خطة المراجعة الأسبوعية. افتح مُحاضِر وابدأ جلسة قصيرة.", data: { url: "/review" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, hour, minute, channelId: "study-review-plan" },
  })));
}

export async function cancelWeeklyReviewPlanReminders(notificationIds?: string[]) {
  if (Platform.OS === "web") return;
  await Promise.all((notificationIds ?? []).map((notificationId) => Notifications.cancelScheduledNotificationAsync(notificationId)));
}
