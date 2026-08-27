export type FollowUpOverdueReminderTime = "morning" | "evening";

export const FOLLOW_UP_OVERDUE_REMINDER_TIMES: { id: FollowUpOverdueReminderTime; label: string; hour: number }[] = [
  { id: "morning", label: "صباحاً — 9:00", hour: 9 },
  { id: "evening", label: "مساءً — 6:00", hour: 18 },
];

export function normalizeFollowUpOverdueReminderTime(value: unknown): FollowUpOverdueReminderTime {
  return value === "evening" ? "evening" : "morning";
}

export function getFollowUpOverdueReminderSchedule(dueAt: string | undefined, time: unknown, now = new Date()) {
  if (!dueAt || !/^\d{4}-\d{2}-\d{2}$/.test(dueAt)) return undefined;
  const option = FOLLOW_UP_OVERDUE_REMINDER_TIMES.find((item) => item.id === normalizeFollowUpOverdueReminderTime(time))!;
  const trigger = new Date(`${dueAt}T12:00:00`);
  if (Number.isNaN(trigger.getTime())) return undefined;
  trigger.setDate(trigger.getDate() + 1);
  trigger.setHours(option.hour, 0, 0, 0);
  if (trigger.getTime() <= now.getTime()) {
    trigger.setTime(now.getTime());
    trigger.setHours(option.hour, 0, 0, 0);
    if (trigger.getTime() <= now.getTime()) trigger.setDate(trigger.getDate() + 1);
  }
  return trigger;
}

export function getFollowUpOverdueReminderScheduleKey(dueAt: string | undefined, time: unknown) {
  if (!dueAt) return undefined;
  return `${dueAt}:${normalizeFollowUpOverdueReminderTime(time)}`;
}
