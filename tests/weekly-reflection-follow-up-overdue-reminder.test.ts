import { describe, expect, it } from "vitest";
import { getFollowUpOverdueReminderSchedule, getFollowUpOverdueReminderScheduleKey, normalizeFollowUpOverdueReminderTime } from "../lib/weekly-reflection-follow-up-overdue-reminder";

describe("تنبيه خطوة المتابعة المتأخرة", () => {
  it("يختار صباح اليوم التالي للاستحقاق ويرحل إلى الوقت التالي إذا مضى الموعد", () => {
    expect(getFollowUpOverdueReminderSchedule("2026-08-21", "morning", new Date("2026-08-20T12:00:00.000Z"))?.toISOString()).toBe("2026-08-22T09:00:00.000Z");
    expect(getFollowUpOverdueReminderSchedule("2026-08-21", "evening", new Date("2026-08-22T19:00:00.000Z"))?.toISOString()).toBe("2026-08-23T18:00:00.000Z");
    expect(getFollowUpOverdueReminderScheduleKey("2026-08-21", "evening")).toBe("2026-08-21:evening");
    expect(normalizeFollowUpOverdueReminderTime("غير صالح")).toBe("morning");
  });
});
