export const WEEKLY_REFLECTION_REMINDER_HOURS = [16, 18, 20, 21] as const;
export const WEEKLY_REFLECTION_REMINDER_MINUTES = [0, 15, 30, 45] as const;
export function normalizeWeeklyReflectionReminderHour(hour?: number) { return typeof hour === "number" && Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 20; }
export function normalizeWeeklyReflectionReminderMinute(minute?: number) { return typeof minute === "number" && Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : 0; }
