import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import { StudyProvider, useStudy } from "@/lib/study-context";
import { AppLockProvider } from "@/lib/app-lock";
import { AppLockGate } from "@/components/app-lock-gate";
import { createTRPCClient, trpc } from "@/lib/trpc";
import { normalizeAppearanceMode } from "@/lib/appearance-preference";
import { ThemeProvider, useThemeContext } from "@/lib/theme-provider";
import { cancelSubjectSmartReminder, cancelWeeklyReflectionFollowUpOverdueReminder, scheduleWeeklyReflectionFollowUpOverdueReminder } from "@/lib/study-reminders";
import { getFollowUpOverdueReminderScheduleKey, normalizeFollowUpOverdueReminderTime } from "@/lib/weekly-reflection-follow-up-overdue-reminder";
import { isSubjectWeeklyGoalComplete } from "@/lib/subject-smart-reminder";
import { getSubjectWeeklyGoalProgress, getWeekStartIso } from "@/lib/subject-weekly-goals";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient());
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppLockProvider>
          <StudyProvider>
            <ThemeProvider><ThemedNavigator /></ThemeProvider>
          </StudyProvider>
        </AppLockProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

function ThemedNavigator() {
  const { hydrated, lectures, replaceWeeklyReflections, reviewCards, reviewSessions, setSubjectSmartReminder, subjectSmartReminders, syncSettings, weeklyReflections, weeklySubjectGoals } = useStudy();
  const { colorScheme, setColorScheme } = useThemeContext();
  const router = useRouter();
  useEffect(() => {
    if (!hydrated) return;
    const preferred = normalizeAppearanceMode(syncSettings.appearanceMode);
    if (preferred !== colorScheme) setColorScheme(preferred);
  }, [colorScheme, hydrated, setColorScheme, syncSettings.appearanceMode]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const redirect = (notification: Notifications.Notification) => { const url = notification.request.content.data?.url; if (typeof url === "string" && url.startsWith("/")) router.push(url as never); };
    void Notifications.getLastNotificationResponseAsync().then((response) => { if (response?.notification) redirect(response.notification); });
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => redirect(response.notification));
    return () => subscription.remove();
  }, [router]);
  useEffect(() => {
    if (!hydrated) return;
    const enabled = Boolean(syncSettings.weeklyReflectionFollowUpOverdueReminderEnabled);
    const time = normalizeFollowUpOverdueReminderTime(syncSettings.weeklyReflectionFollowUpOverdueReminderTime);
    void (async () => {
      let changed = false;
      const next = await Promise.all((weeklyReflections ?? []).map(async (reflection) => {
        const shouldSchedule = enabled && Boolean(reflection.followUpGoal && !reflection.followUpCompleted && reflection.followUpDueAt);
        const scheduleKey = shouldSchedule ? getFollowUpOverdueReminderScheduleKey(reflection.followUpDueAt, time) : undefined;
        if (!shouldSchedule) { if (reflection.followUpOverdueReminderNotificationId) { await cancelWeeklyReflectionFollowUpOverdueReminder(reflection.followUpOverdueReminderNotificationId); changed = true; return { ...reflection, followUpOverdueReminderNotificationId: undefined, followUpOverdueReminderScheduleKey: undefined }; } return reflection; }
        if (reflection.followUpOverdueReminderNotificationId && reflection.followUpOverdueReminderScheduleKey === scheduleKey) return reflection;
        if (reflection.followUpOverdueReminderNotificationId) await cancelWeeklyReflectionFollowUpOverdueReminder(reflection.followUpOverdueReminderNotificationId);
        const notificationId = await scheduleWeeklyReflectionFollowUpOverdueReminder(reflection.followUpGoal!, reflection.followUpDueAt!, time);
        if (!notificationId && !reflection.followUpOverdueReminderNotificationId) return reflection;
        changed = true;
        return { ...reflection, followUpOverdueReminderNotificationId: notificationId, followUpOverdueReminderScheduleKey: notificationId ? scheduleKey : undefined };
      }));
      if (changed) replaceWeeklyReflections(next);
    })();
  }, [hydrated, replaceWeeklyReflections, syncSettings.weeklyReflectionFollowUpOverdueReminderEnabled, syncSettings.weeklyReflectionFollowUpOverdueReminderTime, weeklyReflections]);
  useEffect(() => {
    if (!hydrated) return;
    const weekStart = getWeekStartIso();
    const currentGoals = weeklySubjectGoals ?? [];
    void Promise.all((subjectSmartReminders ?? []).filter((reminder) => reminder.enabled && reminder.notificationId && reminder.weekStart === weekStart).map(async (reminder) => {
      const goal = currentGoals.find((item) => item.subjectId === reminder.subjectId && item.weekStart === weekStart);
      if (!goal) return;
      const progress = getSubjectWeeklyGoalProgress(reminder.subjectId, weekStart, lectures, reviewCards, reviewSessions ?? []);
      if (!isSubjectWeeklyGoalComplete(progress, goal)) return;
      await cancelSubjectSmartReminder(reminder.notificationId);
      setSubjectSmartReminder(reminder.subjectId, { ...reminder, enabled: false, notificationId: undefined });
    }));
  }, [hydrated, lectures, reviewCards, reviewSessions, setSubjectSmartReminder, subjectSmartReminders, weeklySubjectGoals]);
  return <><StatusBar style={colorScheme === "dark" ? "light" : "dark"} /><AppLockGate><Stack screenOptions={{ headerShown: false, animation: "slide_from_left" }}><Stack.Screen name="(tabs)" /><Stack.Screen name="year/[yearId]" /><Stack.Screen name="term/[termId]" /><Stack.Screen name="subject/[subjectId]" /><Stack.Screen name="record" options={{ presentation: "modal", animation: "slide_from_bottom" }} /><Stack.Screen name="lecture/[lectureId]" /><Stack.Screen name="storage" /><Stack.Screen name="follow-up-steps" /></Stack></AppLockGate></>;
}
