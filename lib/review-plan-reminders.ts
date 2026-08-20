/** يحوّل أرقام أيام JavaScript (الأحد=0) إلى قائمة أسبوعية فريدة وصالحة. */
export function normalizeWeeklyReviewDays(days: number[]) {
  return Array.from(new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))).sort((a, b) => a - b);
}

export const WEEKLY_REVIEW_REMINDER_HOURS = [16, 18, 20, 21] as const;
export const WEEKLY_REVIEW_REMINDER_MINUTES = [0, 15, 30, 45] as const;

export function normalizeWeeklyReviewReminderHour(hour?: number) {
  return typeof hour === "number" && Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 18;
}

export function normalizeWeeklyReviewReminderMinute(minute?: number) {
  return typeof minute === "number" && Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : 0;
}
