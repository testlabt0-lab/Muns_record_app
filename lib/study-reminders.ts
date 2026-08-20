import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

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
