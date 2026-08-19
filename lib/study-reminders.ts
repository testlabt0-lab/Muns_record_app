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
