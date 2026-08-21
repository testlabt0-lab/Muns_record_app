import { describe, expect, it } from "vitest";
import { getUpcomingFollowUpReminderDate } from "../lib/weekly-reflection-follow-up-reminder";

describe("تذكير هدف المتابعة", () => { it("يختار الأربعاء القادم الساعة السابعة مساءً", () => { const value = getUpcomingFollowUpReminderDate(new Date("2026-01-05T10:00:00")); expect(value.getDay()).toBe(3); expect(value.getHours()).toBe(19); }); it("ينقل الموعد للأسبوع التالي بعد مرور وقت الأربعاء", () => { const value = getUpcomingFollowUpReminderDate(new Date("2026-01-07T20:00:00")); expect(value.getDate()).toBe(14); }); });
