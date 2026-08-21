import { describe, expect, it } from "vitest";
import { normalizeWeeklyReflectionReminderHour, normalizeWeeklyReflectionReminderMinute } from "../lib/weekly-reflection-reminder";

describe("وقت تذكير الملاحظة الأسبوعية", () => { it("يعيد القيم الافتراضية للقيم غير الصالحة", () => { expect(normalizeWeeklyReflectionReminderHour(25)).toBe(20); expect(normalizeWeeklyReflectionReminderMinute(-1)).toBe(0); expect(normalizeWeeklyReflectionReminderHour(18)).toBe(18); }); });
