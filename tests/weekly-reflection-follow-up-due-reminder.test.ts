import { describe, expect, it } from "vitest";
import { canScheduleFollowUpDueReminder, getFollowUpDueReminderDate } from "../lib/weekly-reflection-follow-up-due-reminder";

describe("تنبيه استحقاق هدف المتابعة", () => { it("يضبط التنبيه في السادسة مساء اليوم السابق للاستحقاق", () => { const reminder = getFollowUpDueReminderDate("2026-01-10"); expect(reminder.getDate()).toBe(9); expect(reminder.getHours()).toBe(18); expect(canScheduleFollowUpDueReminder("2026-01-10", new Date("2026-01-08T10:00:00"))).toBe(true); }); });
