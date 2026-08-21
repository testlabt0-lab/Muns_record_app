export const FOLLOW_UP_REMINDER_HOUR = 19;
export function getUpcomingFollowUpReminderDate(now = new Date()) { const target = new Date(now); target.setHours(FOLLOW_UP_REMINDER_HOUR, 0, 0, 0); const daysUntilWednesday = (3 - target.getDay() + 7) % 7; target.setDate(target.getDate() + daysUntilWednesday); if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 7); return target; }
