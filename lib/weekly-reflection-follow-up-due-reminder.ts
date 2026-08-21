export function getFollowUpDueReminderDate(dueAt: string) { const due = new Date(`${dueAt}T18:00:00`); due.setDate(due.getDate() - 1); return due; }
export function canScheduleFollowUpDueReminder(dueAt: string, now = new Date()) { return getFollowUpDueReminderDate(dueAt).getTime() > now.getTime(); }
