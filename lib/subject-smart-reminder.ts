import type { SubjectSmartReminder } from "./study-types";

export const SUBJECT_SMART_REMINDER_DAYS = [{ weekday: 5 as const, label: "الخميس" }, { weekday: 6 as const, label: "الجمعة" }, { weekday: 7 as const, label: "السبت" }];
export const SUBJECT_SMART_REMINDER_HOURS = [17, 19, 21] as const;
export const SUBJECT_SMART_REMINDER_MINUTES = [0, 30] as const;

export function normalizeSubjectSmartReminder(input: Partial<SubjectSmartReminder>): Omit<SubjectSmartReminder, "subjectId" | "weekStart" | "notificationId"> {
  const weekday = SUBJECT_SMART_REMINDER_DAYS.some((item) => item.weekday === input.weekday) ? input.weekday! : 5;
  const hour = SUBJECT_SMART_REMINDER_HOURS.includes(input.hour as 17 | 19 | 21) ? input.hour! : 19;
  const minute = SUBJECT_SMART_REMINDER_MINUTES.includes(input.minute as 0 | 30) ? input.minute! : 0;
  return { enabled: Boolean(input.enabled), weekday, hour, minute };
}

export function getSubjectSmartReminderTimeLabel(reminder: Pick<SubjectSmartReminder, "weekday" | "hour" | "minute">) {
  const day = SUBJECT_SMART_REMINDER_DAYS.find((item) => item.weekday === reminder.weekday)?.label ?? "الخميس";
  return `${day}، ${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}`;
}

/** يعيد موعداً في الأسبوع الدراسي الحالي فقط، ولا ينقل التذكير تلقائياً إلى أسبوع جديد. */
export function getSubjectSmartReminderDate(reminder: Pick<SubjectSmartReminder, "weekday" | "hour" | "minute">, now = new Date()) {
  const date = new Date(now);
  const mondayOffset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  date.setDate(date.getDate() + mondayOffset + reminder.weekday - 2);
  date.setHours(reminder.hour, reminder.minute, 0, 0);
  return date.getTime() > now.getTime() ? date : undefined;
}
